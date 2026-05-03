import { F as Matrix4, G as negate, K as clamp, W as add, X as defaultLogger, o as Viewport, y as pixelsToWorld } from "./shader-BokkZAiK.js";
//#region node_modules/@deck.gl/core/dist/passes/pass.js
/**
* Base class for passes
* @todo v9 - should the luma.gl RenderPass be owned by this class?
* Currently owned by subclasses
*/
var Pass = class {
	/** Create a new Pass instance */
	constructor(device, props = { id: "pass" }) {
		const { id } = props;
		this.id = id;
		this.device = device;
		this.props = { ...props };
	}
	setProps(props) {
		Object.assign(this.props, props);
	}
	render(params) {}
	cleanup() {}
};
//#endregion
//#region node_modules/@deck.gl/core/dist/passes/layers-pass.js
var WEBGPU_DEFAULT_DRAW_PARAMETERS = {
	depthWriteEnabled: true,
	depthCompare: "less-equal",
	blendColorOperation: "add",
	blendColorSrcFactor: "src-alpha",
	blendColorDstFactor: "one",
	blendAlphaOperation: "add",
	blendAlphaSrcFactor: "one-minus-dst-alpha",
	blendAlphaDstFactor: "one"
};
/** A Pass that renders all layers */
var LayersPass = class extends Pass {
	constructor() {
		super(...arguments);
		this._lastRenderIndex = -1;
	}
	render(options) {
		this._render(options);
	}
	_render(options) {
		const canvasContext = this.device.canvasContext;
		const framebuffer = options.target ?? canvasContext.getCurrentFramebuffer();
		const [width, height] = canvasContext.getDrawingBufferSize();
		const clearCanvas = options.clearCanvas ?? true;
		const clearColor = options.clearColor ?? (clearCanvas ? [
			0,
			0,
			0,
			0
		] : false);
		const clearDepth = clearCanvas ? 1 : false;
		const clearStencil = clearCanvas ? 0 : false;
		const colorMask = options.colorMask ?? 15;
		const parameters = { viewport: [
			0,
			0,
			width,
			height
		] };
		if (options.colorMask) parameters.colorMask = colorMask;
		if (options.scissorRect) parameters.scissorRect = options.scissorRect;
		const renderPass = this.device.beginRenderPass({
			framebuffer,
			parameters,
			clearColor,
			clearDepth,
			clearStencil
		});
		try {
			return this._drawLayers(renderPass, options);
		} finally {
			renderPass.end();
			this.device.submit();
		}
	}
	/** Draw a list of layers in a list of viewports */
	_drawLayers(renderPass, options) {
		const { target, shaderModuleProps, viewports, views, onViewportActive, clearStack = true } = options;
		options.pass = options.pass || "unknown";
		if (clearStack) this._lastRenderIndex = -1;
		const renderStats = [];
		for (const viewport of viewports) {
			const view = views && views[viewport.id];
			onViewportActive?.(viewport);
			const drawLayerParams = this._getDrawLayerParams(viewport, options);
			const subViewports = viewport.subViewports || [viewport];
			for (const subViewport of subViewports) {
				const stats = this._drawLayersInViewport(renderPass, {
					target,
					shaderModuleProps,
					viewport: subViewport,
					view,
					pass: options.pass,
					layers: options.layers
				}, drawLayerParams);
				renderStats.push(stats);
			}
		}
		return renderStats;
	}
	_getDrawLayerParams(viewport, { layers, pass, isPicking = false, layerFilter, cullRect, effects, shaderModuleProps }, evaluateShouldDrawOnly = false) {
		const drawLayerParams = [];
		const indexResolver = layerIndexResolver(this._lastRenderIndex + 1);
		const drawContext = {
			layer: layers[0],
			viewport,
			isPicking,
			renderPass: pass,
			cullRect
		};
		const layerFilterCache = {};
		for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
			const layer = layers[layerIndex];
			const shouldDrawLayer = this._shouldDrawLayer(layer, drawContext, layerFilter, layerFilterCache);
			const layerParam = { shouldDrawLayer };
			if (shouldDrawLayer && !evaluateShouldDrawOnly) {
				layerParam.shouldDrawLayer = true;
				layerParam.layerRenderIndex = indexResolver(layer, shouldDrawLayer);
				layerParam.shaderModuleProps = this._getShaderModuleProps(layer, effects, pass, shaderModuleProps);
				layerParam.layerParameters = {
					...layer.context.device.type === "webgpu" ? WEBGPU_DEFAULT_DRAW_PARAMETERS : null,
					...layer.context.deck?.props.parameters,
					...this.getLayerParameters(layer, layerIndex, viewport)
				};
			}
			drawLayerParams[layerIndex] = layerParam;
		}
		return drawLayerParams;
	}
	_drawLayersInViewport(renderPass, { layers, shaderModuleProps: globalModuleParameters, pass, target, viewport, view }, drawLayerParams) {
		const glViewport = getGLViewport(this.device, {
			shaderModuleProps: globalModuleParameters,
			target,
			viewport
		});
		if (view) {
			const { clear, clearColor, clearDepth, clearStencil } = view.props;
			if (clear) {
				let colorToUse = [
					0,
					0,
					0,
					0
				];
				let depthToUse = 1;
				let stencilToUse = 0;
				if (Array.isArray(clearColor)) colorToUse = [...clearColor.slice(0, 3), clearColor[3] || 255].map((c) => c / 255);
				else if (clearColor === false) colorToUse = false;
				if (clearDepth !== void 0) depthToUse = clearDepth;
				if (clearStencil !== void 0) stencilToUse = clearStencil;
				this.device.beginRenderPass({
					framebuffer: target,
					parameters: {
						viewport: glViewport,
						scissorRect: glViewport
					},
					clearColor: colorToUse,
					clearDepth: depthToUse,
					clearStencil: stencilToUse
				}).end();
			}
		}
		const renderStatus = {
			totalCount: layers.length,
			visibleCount: 0,
			compositeCount: 0,
			pickableCount: 0
		};
		renderPass.setParameters({ viewport: glViewport });
		for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
			const layer = layers[layerIndex];
			const drawLayerParameters = drawLayerParams[layerIndex];
			const { shouldDrawLayer } = drawLayerParameters;
			if (shouldDrawLayer && layer.props.pickable) renderStatus.pickableCount++;
			if (layer.isComposite) renderStatus.compositeCount++;
			if (layer.isDrawable && drawLayerParameters.shouldDrawLayer) {
				const { layerRenderIndex, shaderModuleProps, layerParameters } = drawLayerParameters;
				renderStatus.visibleCount++;
				this._lastRenderIndex = Math.max(this._lastRenderIndex, layerRenderIndex);
				if (shaderModuleProps.project) shaderModuleProps.project.viewport = viewport;
				layer.context.renderPass = renderPass;
				try {
					layer._drawLayer({
						renderPass,
						shaderModuleProps,
						uniforms: { layerIndex: layerRenderIndex },
						parameters: layerParameters
					});
				} catch (err) {
					layer.raiseError(err, `drawing ${layer} to ${pass}`);
				}
			}
		}
		return renderStatus;
	}
	shouldDrawLayer(layer) {
		return true;
	}
	getShaderModuleProps(layer, effects, otherShaderModuleProps) {
		return null;
	}
	getLayerParameters(layer, layerIndex, viewport) {
		return layer.props.parameters;
	}
	_shouldDrawLayer(layer, drawContext, layerFilter, layerFilterCache) {
		if (!(layer.props.visible && this.shouldDrawLayer(layer))) return false;
		drawContext.layer = layer;
		let parent = layer.parent;
		while (parent) {
			if (!parent.props.visible || !parent.filterSubLayer(drawContext)) return false;
			drawContext.layer = parent;
			parent = parent.parent;
		}
		if (layerFilter) {
			const rootLayerId = drawContext.layer.id;
			if (!(rootLayerId in layerFilterCache)) layerFilterCache[rootLayerId] = layerFilter(drawContext);
			if (!layerFilterCache[rootLayerId]) return false;
		}
		layer.activateViewport(drawContext.viewport);
		return true;
	}
	_getShaderModuleProps(layer, effects, pass, overrides) {
		const devicePixelRatio = this.device.canvasContext.cssToDeviceRatio();
		const layerProps = layer.internalState?.propsInTransition || layer.props;
		const shaderModuleProps = {
			layer: layerProps,
			picking: { isActive: false },
			project: {
				viewport: layer.context.viewport,
				devicePixelRatio,
				modelMatrix: layerProps.modelMatrix,
				coordinateSystem: layerProps.coordinateSystem,
				coordinateOrigin: layerProps.coordinateOrigin,
				autoWrapLongitude: layer.wrapLongitude
			}
		};
		if (effects) for (const effect of effects) mergeModuleParameters(shaderModuleProps, effect.getShaderModuleProps?.(layer, shaderModuleProps));
		return mergeModuleParameters(shaderModuleProps, this.getShaderModuleProps(layer, effects, shaderModuleProps), overrides);
	}
};
function layerIndexResolver(startIndex = 0, layerIndices = {}) {
	const resolvers = {};
	const resolveLayerIndex = (layer, isDrawn) => {
		const indexOverride = layer.props._offset;
		const layerId = layer.id;
		const parentId = layer.parent && layer.parent.id;
		let index;
		if (parentId && !(parentId in layerIndices)) resolveLayerIndex(layer.parent, false);
		if (parentId in resolvers) {
			const resolver = resolvers[parentId] = resolvers[parentId] || layerIndexResolver(layerIndices[parentId], layerIndices);
			index = resolver(layer, isDrawn);
			resolvers[layerId] = resolver;
		} else if (Number.isFinite(indexOverride)) {
			index = indexOverride + (layerIndices[parentId] || 0);
			resolvers[layerId] = null;
		} else index = startIndex;
		if (isDrawn && index >= startIndex) startIndex = index + 1;
		layerIndices[layerId] = index;
		return index;
	};
	return resolveLayerIndex;
}
function getGLViewport(device, { shaderModuleProps, target, viewport }) {
	const pixelRatio = shaderModuleProps?.project?.devicePixelRatio ?? device.canvasContext.cssToDeviceRatio();
	const [, drawingBufferHeight] = device.canvasContext.getDrawingBufferSize();
	const height = target ? target.height : drawingBufferHeight;
	const dimensions = viewport;
	return [
		dimensions.x * pixelRatio,
		height - (dimensions.y + dimensions.height) * pixelRatio,
		dimensions.width * pixelRatio,
		dimensions.height * pixelRatio
	];
}
function mergeModuleParameters(target, ...sources) {
	for (const source of sources) if (source) for (const key in source) if (target[key]) Object.assign(target[key], source[key]);
	else target[key] = source[key];
	return target;
}
//#endregion
//#region node_modules/@deck.gl/core/dist/passes/pick-layers-pass.js
var PICKING_BLENDING = {
	blendColorOperation: "add",
	blendColorSrcFactor: "one",
	blendColorDstFactor: "zero",
	blendAlphaOperation: "add",
	blendAlphaSrcFactor: "constant",
	blendAlphaDstFactor: "zero"
};
var PickLayersPass = class extends LayersPass {
	constructor() {
		super(...arguments);
		this._colorEncoderState = null;
	}
	render(props) {
		if ("pickingFBO" in props) return this._drawPickingBuffer(props);
		return {
			decodePickingColor: null,
			stats: super._render(props)
		};
	}
	_drawPickingBuffer({ layers, layerFilter, views, viewports, onViewportActive, pickingFBO, deviceRect: { x, y, width, height }, cullRect, effects, pass = "picking", pickZ, shaderModuleProps, clearColor }) {
		this.pickZ = pickZ;
		const colorEncoderState = this._resetColorEncoder(pickZ);
		const scissorRect = [
			x,
			y,
			width,
			height
		];
		const renderStatus = super._render({
			target: pickingFBO,
			layers,
			layerFilter,
			views,
			viewports,
			onViewportActive,
			cullRect,
			effects: effects?.filter((e) => e.useInPicking),
			pass,
			isPicking: true,
			shaderModuleProps,
			clearColor: clearColor ?? [
				0,
				0,
				0,
				0
			],
			colorMask: 15,
			scissorRect
		});
		this._colorEncoderState = null;
		return {
			decodePickingColor: colorEncoderState && decodeColor.bind(null, colorEncoderState),
			stats: renderStatus
		};
	}
	shouldDrawLayer(layer) {
		const { pickable, operation } = layer.props;
		return pickable && operation.includes("draw") || operation.includes("terrain") || operation.includes("mask");
	}
	getShaderModuleProps(layer, effects, otherShaderModuleProps) {
		return {
			picking: {
				isActive: 1,
				isAttribute: this.pickZ
			},
			lighting: { enabled: false }
		};
	}
	getLayerParameters(layer, layerIndex, viewport) {
		const pickParameters = { ...layer.props.parameters };
		const { pickable, operation } = layer.props;
		if (!this._colorEncoderState) pickParameters.blend = false;
		else if (pickable && operation.includes("draw")) {
			Object.assign(pickParameters, PICKING_BLENDING);
			pickParameters.blend = true;
			if (this.device.type === "webgpu") pickParameters.blendConstant = encodeColor(this._colorEncoderState, layer, viewport);
			else pickParameters.blendColor = encodeColor(this._colorEncoderState, layer, viewport);
			if (operation.includes("terrain") && layer.state?._hasPickingCover) pickParameters.blendAlphaSrcFactor = "one";
		} else if (operation.includes("terrain")) pickParameters.blend = false;
		return pickParameters;
	}
	_resetColorEncoder(pickZ) {
		this._colorEncoderState = pickZ ? null : {
			byLayer: /* @__PURE__ */ new Map(),
			byAlpha: []
		};
		return this._colorEncoderState;
	}
};
function encodeColor(encoded, layer, viewport) {
	const { byLayer, byAlpha } = encoded;
	let a;
	let entry = byLayer.get(layer);
	if (entry) {
		entry.viewports.push(viewport);
		a = entry.a;
	} else {
		a = byLayer.size + 1;
		if (a <= 255) {
			entry = {
				a,
				layer,
				viewports: [viewport]
			};
			byLayer.set(layer, entry);
			byAlpha[a] = entry;
		} else {
			defaultLogger.warn("Too many pickable layers, only picking the first 255")();
			a = 0;
		}
	}
	return [
		0,
		0,
		0,
		a / 255
	];
}
function decodeColor(encoded, pickedColor) {
	const entry = encoded.byAlpha[pickedColor[3]];
	return entry && {
		pickedLayer: entry.layer,
		pickedViewports: entry.viewports,
		pickedObjectIndex: entry.layer.decodePickingColor(pickedColor)
	};
}
//#endregion
//#region node_modules/@deck.gl/core/dist/viewports/orthographic-viewport.js
var viewMatrix = new Matrix4().lookAt({ eye: [
	0,
	0,
	1
] });
function getProjectionMatrix({ width, height, near, far, padding }) {
	let left = -width / 2;
	let right = width / 2;
	let bottom = -height / 2;
	let top = height / 2;
	if (padding) {
		const { left: l = 0, right: r = 0, top: t = 0, bottom: b = 0 } = padding;
		const offsetX = clamp((l + width - r) / 2, 0, width) - width / 2;
		const offsetY = clamp((t + height - b) / 2, 0, height) - height / 2;
		left -= offsetX;
		right -= offsetX;
		bottom += offsetY;
		top += offsetY;
	}
	return new Matrix4().ortho({
		left,
		right,
		bottom,
		top,
		near,
		far
	});
}
var OrthographicViewport = class extends Viewport {
	constructor(props) {
		const { width, height, near = .1, far = 1e3, zoom = 0, target = [
			0,
			0,
			0
		], padding = null, flipY = true } = props;
		const zoomX = props.zoomX ?? (Array.isArray(zoom) ? zoom[0] : zoom);
		const zoomY = props.zoomY ?? (Array.isArray(zoom) ? zoom[1] : zoom);
		const zoom_ = Math.min(zoomX, zoomY);
		const scale = Math.pow(2, zoom_);
		let distanceScales;
		if (zoomX !== zoomY) {
			const scaleX = Math.pow(2, zoomX);
			const scaleY = Math.pow(2, zoomY);
			distanceScales = {
				unitsPerMeter: [
					scaleX / scale,
					scaleY / scale,
					1
				],
				metersPerUnit: [
					scale / scaleX,
					scale / scaleY,
					1
				]
			};
		}
		super({
			...props,
			longitude: void 0,
			position: target,
			viewMatrix: viewMatrix.clone().scale([
				scale,
				scale * (flipY ? -1 : 1),
				scale
			]),
			projectionMatrix: getProjectionMatrix({
				width: width || 1,
				height: height || 1,
				padding,
				near,
				far
			}),
			zoom: zoom_,
			distanceScales
		});
		this.target = target;
		this.zoomX = zoomX;
		this.zoomY = zoomY;
		this.flipY = flipY;
	}
	projectFlat([X, Y]) {
		const { unitsPerMeter } = this.distanceScales;
		return [X * unitsPerMeter[0], Y * unitsPerMeter[1]];
	}
	unprojectFlat([x, y]) {
		const { metersPerUnit } = this.distanceScales;
		return [x * metersPerUnit[0], y * metersPerUnit[1]];
	}
	panByPosition(coords, pixel, startPixel) {
		const fromLocation = pixelsToWorld(pixel, this.pixelUnprojectionMatrix);
		const translate = add([], this.projectFlat(coords), negate([], fromLocation));
		const newCenter = add([], this.center, translate);
		return { target: this.unprojectFlat(newCenter) };
	}
};
OrthographicViewport.displayName = "OrthographicViewport";
//#endregion
export { PickLayersPass as n, LayersPass as r, OrthographicViewport as t };

//# sourceMappingURL=orthographic-viewport-BmLxrKyC.js.map