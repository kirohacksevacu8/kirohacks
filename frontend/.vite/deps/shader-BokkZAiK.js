import { C as Resource, E as ProbeLog, S as Buffer, T as log, _ as isExternalImage, b as vertexFormatDecoder, c as resolveVariableShaderTypeAlias, d as RenderPipeline, f as Shader, g as getExternalImageSize, h as Sampler, m as Texture, n as getScratchArrayBuffer, o as getAttributeInfosFromLayouts, p as TextureView, r as alignTo, s as getVariableShaderTypeInfo, u as normalizeBindingsByGroup, w as uid$1, x as dataTypeDecoder } from "./array-utils-flat-Bju7gTeo.js";
//#region node_modules/@math.gl/types/dist/is-array.js
/**
* Check is an array is a typed array
* @param value value to be tested
* @returns input with type narrowed to TypedArray, or null
*/
function isTypedArray$1(value) {
	return ArrayBuffer.isView(value) && !(value instanceof DataView);
}
/**
* Check is an array is an array of numbers)
* @param value value to be tested
* @returns input with type narrowed to NumberArray, or null
*/
function isNumberArray$1(value) {
	if (Array.isArray(value)) return value.length === 0 || typeof value[0] === "number";
	return false;
}
/**
* Check is an array is a numeric array (typed array or array of numbers)
* @param value value to be tested
* @returns input with type narrowed to NumericArray, or null
*/
function isNumericArray(value) {
	return isTypedArray$1(value) || isNumberArray$1(value);
}
//#endregion
//#region node_modules/@deck.gl/core/dist/utils/log.js
var defaultLogger = new ProbeLog({ id: "deck" });
//#endregion
//#region node_modules/@luma.gl/shadertools/dist/lib/utils/assert.js
function assert$2(condition, message) {
	if (!condition) {
		const error = new Error(message || "shadertools: assertion failed.");
		Error.captureStackTrace?.(error, assert$2);
		throw error;
	}
}
//#endregion
//#region node_modules/@luma.gl/shadertools/dist/lib/filters/prop-types.js
/** Minimal validators for number and array types */
var DEFAULT_PROP_VALIDATORS = {
	number: {
		type: "number",
		validate(value, propType) {
			return Number.isFinite(value) && typeof propType === "object" && (propType.max === void 0 || value <= propType.max) && (propType.min === void 0 || value >= propType.min);
		}
	},
	array: {
		type: "array",
		validate(value, propType) {
			return Array.isArray(value) || ArrayBuffer.isView(value);
		}
	}
};
/**
* Parse a list of property types into property definitions that can be used to validate
* values passed in by applications.
* @param propTypes
* @returns
*/
function makePropValidators(propTypes) {
	const propValidators = {};
	for (const [name, propType] of Object.entries(propTypes)) propValidators[name] = makePropValidator(propType);
	return propValidators;
}
/**
* Creates a property validator for a prop type. Either contains:
* - a valid prop type object ({type, ...})
* - or just a default value, in which case type and name inference is used
*/
function makePropValidator(propType) {
	let type = getTypeOf(propType);
	if (type !== "object") return {
		value: propType,
		...DEFAULT_PROP_VALIDATORS[type],
		type
	};
	if (typeof propType === "object") {
		if (!propType) return {
			type: "object",
			value: null
		};
		if (propType.type !== void 0) return {
			...propType,
			...DEFAULT_PROP_VALIDATORS[propType.type],
			type: propType.type
		};
		if (propType.value === void 0) return {
			type: "object",
			value: propType
		};
		type = getTypeOf(propType.value);
		return {
			...propType,
			...DEFAULT_PROP_VALIDATORS[type],
			type
		};
	}
	throw new Error("props");
}
/**
* "improved" version of javascript typeof that can distinguish arrays and null values
*/
function getTypeOf(value) {
	if (Array.isArray(value) || ArrayBuffer.isView(value)) return "array";
	return typeof value;
}
//#endregion
//#region node_modules/@luma.gl/shadertools/dist/lib/shader-assembly/shader-injections.js
var MODULE_INJECTORS = {
	vertex: `\
#ifdef MODULE_LOGDEPTH
  logdepth_adjustPosition(gl_Position);
#endif
`,
	fragment: `\
#ifdef MODULE_MATERIAL
  fragColor = material_filterColor(fragColor);
#endif

#ifdef MODULE_LIGHTING
  fragColor = lighting_filterColor(fragColor);
#endif

#ifdef MODULE_FOG
  fragColor = fog_filterColor(fragColor);
#endif

#ifdef MODULE_PICKING
  fragColor = picking_filterHighlightColor(fragColor);
  fragColor = picking_filterPickingColor(fragColor);
#endif

#ifdef MODULE_LOGDEPTH
  logdepth_setFragDepth();
#endif
`
};
var REGEX_START_OF_MAIN = /void\s+main\s*\([^)]*\)\s*\{\n?/;
var REGEX_END_OF_MAIN = /}\n?[^{}]*$/;
var fragments = [];
var DECLARATION_INJECT_MARKER = "__LUMA_INJECT_DECLARATIONS__";
/**
*
*/
function normalizeInjections(injections) {
	const result = {
		vertex: {},
		fragment: {}
	};
	for (const hook in injections) {
		let injection = injections[hook];
		const stage = getHookStage(hook);
		if (typeof injection === "string") injection = {
			order: 0,
			injection
		};
		result[stage][hook] = injection;
	}
	return result;
}
function getHookStage(hook) {
	const type = hook.slice(0, 2);
	switch (type) {
		case "vs": return "vertex";
		case "fs": return "fragment";
		default: throw new Error(type);
	}
}
/**
// A minimal shader injection/templating system.
// RFC: https://github.com/visgl/luma.gl/blob/7.0-release/dev-docs/RFCs/v6.0/shader-injection-rfc.md
* @param source
* @param type
* @param inject
* @param injectStandardStubs
* @returns
*/
function injectShader(source, stage, inject, injectStandardStubs = false) {
	const isVertex = stage === "vertex";
	for (const key in inject) {
		const fragmentData = inject[key];
		fragmentData.sort((a, b) => a.order - b.order);
		fragments.length = fragmentData.length;
		for (let i = 0, len = fragmentData.length; i < len; ++i) fragments[i] = fragmentData[i].injection;
		const fragmentString = `${fragments.join("\n")}\n`;
		switch (key) {
			case "vs:#decl":
				if (isVertex) source = source.replace(DECLARATION_INJECT_MARKER, fragmentString);
				break;
			case "vs:#main-start":
				if (isVertex) source = source.replace(REGEX_START_OF_MAIN, (match) => match + fragmentString);
				break;
			case "vs:#main-end":
				if (isVertex) source = source.replace(REGEX_END_OF_MAIN, (match) => fragmentString + match);
				break;
			case "fs:#decl":
				if (!isVertex) source = source.replace(DECLARATION_INJECT_MARKER, fragmentString);
				break;
			case "fs:#main-start":
				if (!isVertex) source = source.replace(REGEX_START_OF_MAIN, (match) => match + fragmentString);
				break;
			case "fs:#main-end":
				if (!isVertex) source = source.replace(REGEX_END_OF_MAIN, (match) => fragmentString + match);
				break;
			default: source = source.replace(key, (match) => match + fragmentString);
		}
	}
	source = source.replace(DECLARATION_INJECT_MARKER, "");
	if (injectStandardStubs) source = source.replace(/\}\s*$/, (match) => match + MODULE_INJECTORS[stage]);
	return source;
}
//#endregion
//#region node_modules/@luma.gl/shadertools/dist/lib/shader-module/shader-module.js
function initializeShaderModules(modules) {
	modules.map((module) => initializeShaderModule(module));
}
function initializeShaderModule(module) {
	if (module.instance) return;
	initializeShaderModules(module.dependencies || []);
	const { propTypes = {}, deprecations = [], inject = {} } = module;
	const instance = {
		normalizedInjections: normalizeInjections(inject),
		parsedDeprecations: parseDeprecationDefinitions(deprecations)
	};
	if (propTypes) instance.propValidators = makePropValidators(propTypes);
	module.instance = instance;
	let defaultProps = {};
	if (propTypes) defaultProps = Object.entries(propTypes).reduce((obj, [key, propType]) => {
		const value = propType?.value;
		if (value) obj[key] = value;
		return obj;
	}, {});
	module.defaultUniforms = {
		...module.defaultUniforms,
		...defaultProps
	};
}
function checkShaderModuleDeprecations(shaderModule, shaderSource, log) {
	shaderModule.deprecations?.forEach((def) => {
		if (def.regex?.test(shaderSource)) if (def.deprecated) log.deprecated(def.old, def.new)();
		else log.removed(def.old, def.new)();
	});
}
function parseDeprecationDefinitions(deprecations) {
	deprecations.forEach((def) => {
		switch (def.type) {
			case "function":
				def.regex = new RegExp(`\\b${def.old}\\(`);
				break;
			default: def.regex = new RegExp(`${def.type} ${def.old};`);
		}
	});
	return deprecations;
}
//#endregion
//#region node_modules/@luma.gl/shadertools/dist/lib/shader-module/shader-module-dependencies.js
/**
* Takes a list of shader module names and returns a new list of
* shader module names that includes all dependencies, sorted so
* that modules that are dependencies of other modules come first.
*
* If the shader glsl code from the returned modules is concatenated
* in the reverse order, it is guaranteed that all functions be resolved and
* that all function and variable definitions come before use.
*
* @param modules - Array of modules (inline modules or module names)
* @return - Array of modules
*/
function getShaderModuleDependencies(modules) {
	initializeShaderModules(modules);
	const moduleMap = {};
	const moduleDepth = {};
	getDependencyGraph({
		modules,
		level: 0,
		moduleMap,
		moduleDepth
	});
	const dependencies = Object.keys(moduleDepth).sort((a, b) => moduleDepth[b] - moduleDepth[a]).map((name) => moduleMap[name]);
	initializeShaderModules(dependencies);
	return dependencies;
}
/**
* Recursively checks module dependencies to calculate dependency level of each module.
*
* @param options.modules - Array of modules
* @param options.level - Current level
* @param options.moduleMap -
* @param options.moduleDepth - Current level
* @return - Map of module name to its level
*/
function getDependencyGraph(options) {
	const { modules, level, moduleMap, moduleDepth } = options;
	if (level >= 5) throw new Error("Possible loop in shader dependency graph");
	for (const module of modules) {
		moduleMap[module.name] = module;
		if (moduleDepth[module.name] === void 0 || moduleDepth[module.name] < level) moduleDepth[module.name] = level;
	}
	for (const module of modules) if (module.dependencies) getDependencyGraph({
		modules: module.dependencies,
		level: level + 1,
		moduleMap,
		moduleDepth
	});
}
//#endregion
//#region node_modules/@luma.gl/shadertools/dist/lib/shader-module/shader-module-uniform-layout.js
/**
* Matches one field declaration inside a GLSL uniform block body.
*/
var GLSL_UNIFORM_BLOCK_FIELD_REGEXP = /^(?:uniform\s+)?(?:(?:lowp|mediump|highp)\s+)?[A-Za-z0-9_]+(?:<[^>]+>)?\s+([A-Za-z0-9_]+)(?:\s*\[[^\]]+\])?\s*;/;
/**
* Matches full GLSL uniform block declarations, including optional layout qualifiers.
*/
var GLSL_UNIFORM_BLOCK_REGEXP = /((?:layout\s*\([^)]*\)\s*)*)uniform\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{([\s\S]*?)\}\s*([A-Za-z_][A-Za-z0-9_]*)?\s*;/g;
/**
* Returns the uniform block type name expected for the supplied shader module.
*/
function getShaderModuleUniformBlockName(module) {
	return `${module.name}Uniforms`;
}
/**
* Returns the ordered field names parsed from a shader module's uniform block.
*
* @returns `null` when the stage has no source or the expected block is absent.
*/
function getShaderModuleUniformBlockFields(module, stage) {
	const shaderSource = stage === "wgsl" ? module.source : stage === "vertex" ? module.vs : module.fs;
	if (!shaderSource) return null;
	const uniformBlockName = getShaderModuleUniformBlockName(module);
	return extractShaderUniformBlockFieldNames(shaderSource, stage === "wgsl" ? "wgsl" : "glsl", uniformBlockName);
}
/**
* Computes the validation result for a shader module's declared and parsed
* uniform-block field lists.
*
* @returns `null` when the module has no declared uniform types or no matching block.
*/
function getShaderModuleUniformLayoutValidationResult(module, stage) {
	const expectedUniformNames = Object.keys(module.uniformTypes || {});
	if (!expectedUniformNames.length) return null;
	const actualUniformNames = getShaderModuleUniformBlockFields(module, stage);
	if (!actualUniformNames) return null;
	return {
		moduleName: module.name,
		uniformBlockName: getShaderModuleUniformBlockName(module),
		stage,
		expectedUniformNames,
		actualUniformNames,
		matches: areStringArraysEqual(expectedUniformNames, actualUniformNames)
	};
}
/**
* Validates that a shader module's parsed uniform block matches `uniformTypes`.
*
* When a mismatch is detected, the helper logs a formatted error and optionally
* throws via {@link assert}.
*/
function validateShaderModuleUniformLayout(module, stage, options = {}) {
	const validationResult = getShaderModuleUniformLayoutValidationResult(module, stage);
	if (!validationResult || validationResult.matches) return validationResult;
	const message = formatShaderModuleUniformLayoutError(validationResult);
	options.log?.error?.(message, validationResult)();
	if (options.throwOnError !== false) assert$2(false, message);
	return validationResult;
}
/**
* Parses all GLSL uniform blocks in a shader source string.
*/
function getGLSLUniformBlocks(shaderSource) {
	const blocks = [];
	const uncommentedSource = stripShaderComments(shaderSource);
	for (const sourceMatch of uncommentedSource.matchAll(GLSL_UNIFORM_BLOCK_REGEXP)) {
		const layoutQualifier = sourceMatch[1]?.trim() || null;
		blocks.push({
			blockName: sourceMatch[2],
			body: sourceMatch[3],
			instanceName: sourceMatch[4] || null,
			layoutQualifier,
			hasLayoutQualifier: Boolean(layoutQualifier),
			isStd140: Boolean(layoutQualifier && /\blayout\s*\([^)]*\bstd140\b[^)]*\)/.exec(layoutQualifier))
		});
	}
	return blocks;
}
/**
* Emits warnings for GLSL uniform blocks that do not explicitly declare
* `layout(std140)`.
*
* @returns The list of parsed blocks that were considered non-compliant.
*/
function warnIfGLSLUniformBlocksAreNotStd140(shaderSource, stage, log, context) {
	const nonStd140Blocks = getGLSLUniformBlocks(shaderSource).filter((block) => !block.isStd140);
	const seenBlockNames = /* @__PURE__ */ new Set();
	for (const block of nonStd140Blocks) {
		if (seenBlockNames.has(block.blockName)) continue;
		seenBlockNames.add(block.blockName);
		const shaderLabel = context?.label ? `${context.label} ` : "";
		const actualLayout = block.hasLayoutQualifier ? `declares ${normalizeWhitespace(block.layoutQualifier)} instead of layout(std140)` : "does not declare layout(std140)";
		const message = `${shaderLabel}${stage} shader uniform block ${block.blockName} ${actualLayout}. luma.gl host-side shader block packing assumes explicit layout(std140) for GLSL uniform blocks. Add \`layout(std140)\` to the block declaration.`;
		log?.warn?.(message, block)();
	}
	return nonStd140Blocks;
}
/**
* Extracts field names from the named GLSL or WGSL uniform block/struct.
*/
function extractShaderUniformBlockFieldNames(shaderSource, language, uniformBlockName) {
	const sourceBody = language === "wgsl" ? extractWGSLStructBody(shaderSource, uniformBlockName) : extractGLSLUniformBlockBody(shaderSource, uniformBlockName);
	if (!sourceBody) return null;
	const fieldNames = [];
	for (const sourceLine of sourceBody.split("\n")) {
		const line = sourceLine.replace(/\/\/.*$/, "").trim();
		if (!line || line.startsWith("#")) continue;
		const fieldMatch = language === "wgsl" ? line.match(/^([A-Za-z0-9_]+)\s*:/) : line.match(GLSL_UNIFORM_BLOCK_FIELD_REGEXP);
		if (fieldMatch) fieldNames.push(fieldMatch[1]);
	}
	return fieldNames;
}
/**
* Extracts the body of a WGSL struct with the supplied name.
*/
function extractWGSLStructBody(shaderSource, uniformBlockName) {
	const structMatch = new RegExp(`\\bstruct\\s+${uniformBlockName}\\b`, "m").exec(shaderSource);
	if (!structMatch) return null;
	const openBraceIndex = shaderSource.indexOf("{", structMatch.index);
	if (openBraceIndex < 0) return null;
	let braceDepth = 0;
	for (let index = openBraceIndex; index < shaderSource.length; index++) {
		const character = shaderSource[index];
		if (character === "{") {
			braceDepth++;
			continue;
		}
		if (character !== "}") continue;
		braceDepth--;
		if (braceDepth === 0) return shaderSource.slice(openBraceIndex + 1, index);
	}
	return null;
}
/**
* Extracts the body of a named GLSL uniform block from shader source.
*/
function extractGLSLUniformBlockBody(shaderSource, uniformBlockName) {
	return getGLSLUniformBlocks(shaderSource).find((candidate) => candidate.blockName === uniformBlockName)?.body || null;
}
/**
* Returns `true` when the two arrays contain the same strings in the same order.
*/
function areStringArraysEqual(leftValues, rightValues) {
	if (leftValues.length !== rightValues.length) return false;
	for (let valueIndex = 0; valueIndex < leftValues.length; valueIndex++) if (leftValues[valueIndex] !== rightValues[valueIndex]) return false;
	return true;
}
/**
* Formats the standard validation error message for a shader-module layout mismatch.
*/
function formatShaderModuleUniformLayoutError(validationResult) {
	const { expectedUniformNames, actualUniformNames } = validationResult;
	const missingUniformNames = expectedUniformNames.filter((uniformName) => !actualUniformNames.includes(uniformName));
	const unexpectedUniformNames = actualUniformNames.filter((uniformName) => !expectedUniformNames.includes(uniformName));
	const mismatchDetails = [`Expected ${expectedUniformNames.length} fields, found ${actualUniformNames.length}.`];
	const firstMismatchDescription = getFirstUniformMismatchDescription(expectedUniformNames, actualUniformNames);
	if (firstMismatchDescription) mismatchDetails.push(firstMismatchDescription);
	if (missingUniformNames.length) mismatchDetails.push(`Missing from shader block (${missingUniformNames.length}): ${formatUniformNameList(missingUniformNames)}.`);
	if (unexpectedUniformNames.length) mismatchDetails.push(`Unexpected in shader block (${unexpectedUniformNames.length}): ${formatUniformNameList(unexpectedUniformNames)}.`);
	if (expectedUniformNames.length <= 12 && actualUniformNames.length <= 12 && (missingUniformNames.length || unexpectedUniformNames.length)) {
		mismatchDetails.push(`Expected: ${expectedUniformNames.join(", ")}.`);
		mismatchDetails.push(`Actual: ${actualUniformNames.join(", ")}.`);
	}
	return `${validationResult.moduleName}: ${validationResult.stage} shader uniform block ${validationResult.uniformBlockName} does not match module.uniformTypes. ${mismatchDetails.join(" ")}`;
}
/**
* Removes line and block comments from shader source before lightweight parsing.
*/
function stripShaderComments(shaderSource) {
	return shaderSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}
/**
* Collapses repeated whitespace in a layout qualifier for log-friendly output.
*/
function normalizeWhitespace(value) {
	return value.replace(/\s+/g, " ").trim();
}
function getFirstUniformMismatchDescription(expectedUniformNames, actualUniformNames) {
	const minimumLength = Math.min(expectedUniformNames.length, actualUniformNames.length);
	for (let index = 0; index < minimumLength; index++) if (expectedUniformNames[index] !== actualUniformNames[index]) return `First mismatch at field ${index + 1}: expected ${expectedUniformNames[index]}, found ${actualUniformNames[index]}.`;
	if (expectedUniformNames.length > actualUniformNames.length) return `Shader block ends after field ${actualUniformNames.length}; expected next field ${expectedUniformNames[actualUniformNames.length]}.`;
	if (actualUniformNames.length > expectedUniformNames.length) return `Shader block has extra field ${actualUniformNames.length}: ${actualUniformNames[expectedUniformNames.length]}.`;
	return null;
}
function formatUniformNameList(uniformNames, maxNames = 8) {
	if (uniformNames.length <= maxNames) return uniformNames.join(", ");
	const remainingCount = uniformNames.length - maxNames;
	return `${uniformNames.slice(0, maxNames).join(", ")}, ... (${remainingCount} more)`;
}
//#endregion
//#region node_modules/@luma.gl/shadertools/dist/lib/shader-assembly/platform-defines.js
/** Adds defines to help identify GPU architecture / platform */
function getPlatformShaderDefines(platformInfo) {
	switch (platformInfo?.gpu.toLowerCase()) {
		case "apple": return `\
#define APPLE_GPU
// Apple optimizes away the calculation necessary for emulated fp64
#define LUMA_FP64_CODE_ELIMINATION_WORKAROUND 1
#define LUMA_FP32_TAN_PRECISION_WORKAROUND 1
// Intel GPU doesn't have full 32 bits precision in same cases, causes overflow
#define LUMA_FP64_HIGH_BITS_OVERFLOW_WORKAROUND 1
`;
		case "nvidia": return `\
#define NVIDIA_GPU
// Nvidia optimizes away the calculation necessary for emulated fp64
#define LUMA_FP64_CODE_ELIMINATION_WORKAROUND 1
`;
		case "intel": return `\
#define INTEL_GPU
// Intel optimizes away the calculation necessary for emulated fp64
#define LUMA_FP64_CODE_ELIMINATION_WORKAROUND 1
// Intel's built-in 'tan' function doesn't have acceptable precision
#define LUMA_FP32_TAN_PRECISION_WORKAROUND 1
// Intel GPU doesn't have full 32 bits precision in same cases, causes overflow
#define LUMA_FP64_HIGH_BITS_OVERFLOW_WORKAROUND 1
`;
		case "amd": return `\
#define AMD_GPU
`;
		default: return `\
#define DEFAULT_GPU
// Prevent driver from optimizing away the calculation necessary for emulated fp64
#define LUMA_FP64_CODE_ELIMINATION_WORKAROUND 1
// Headless Chrome's software shader 'tan' function doesn't have acceptable precision
#define LUMA_FP32_TAN_PRECISION_WORKAROUND 1
// If the GPU doesn't have full 32 bits precision, will causes overflow
#define LUMA_FP64_HIGH_BITS_OVERFLOW_WORKAROUND 1
`;
	}
}
//#endregion
//#region node_modules/@luma.gl/shadertools/dist/lib/shader-transpiler/transpile-glsl-shader.js
/**
* Transpiles GLSL 3.00 shader source code to target GLSL version (3.00 or 1.00)
*
* @note We always run transpiler even if same version e.g. 3.00 => 3.00
* @note For texture sampling transpilation, apps need to use non-standard texture* calls in GLSL 3.00 source
* RFC: https://github.com/visgl/luma.gl/blob/7.0-release/dev-docs/RFCs/v6.0/portable-glsl-300-rfc.md
*/
function transpileGLSLShader(source, stage) {
	if (Number(source.match(/^#version[ \t]+(\d+)/m)?.[1] || 100) !== 300) throw new Error("luma.gl v9 only supports GLSL 3.00 shader sources");
	switch (stage) {
		case "vertex":
			source = convertShader(source, ES300_VERTEX_REPLACEMENTS);
			return source;
		case "fragment":
			source = convertShader(source, ES300_FRAGMENT_REPLACEMENTS);
			return source;
		default: throw new Error(stage);
	}
}
/** Simple regex replacements for GLSL ES 1.00 syntax that has changed in GLSL ES 3.00 */
var ES300_REPLACEMENTS = [
	[/^(#version[ \t]+(100|300[ \t]+es))?[ \t]*\n/, "#version 300 es\n"],
	[/\btexture(2D|2DProj|Cube)Lod(EXT)?\(/g, "textureLod("],
	[/\btexture(2D|2DProj|Cube)(EXT)?\(/g, "texture("]
];
var ES300_VERTEX_REPLACEMENTS = [
	...ES300_REPLACEMENTS,
	[makeVariableTextRegExp("attribute"), "in $1"],
	[makeVariableTextRegExp("varying"), "out $1"]
];
/** Simple regex replacements for GLSL ES 1.00 syntax that has changed in GLSL ES 3.00 */
var ES300_FRAGMENT_REPLACEMENTS = [...ES300_REPLACEMENTS, [makeVariableTextRegExp("varying"), "in $1"]];
function convertShader(source, replacements) {
	for (const [pattern, replacement] of replacements) source = source.replace(pattern, replacement);
	return source;
}
/**
* Creates a regexp that tests for a specific variable type
* @example
*   should match:
*     in float weight;
*     out vec4 positions[2];
*   should not match:
*     void f(out float a, in float b) {}
*/
function makeVariableTextRegExp(qualifier) {
	return new RegExp(`\\b${qualifier}[ \\t]+(\\w+[ \\t]+\\w+(\\[\\w+\\])?;)`, "g");
}
//#endregion
//#region node_modules/@luma.gl/shadertools/dist/lib/shader-assembly/shader-hooks.js
/** Generate hook source code */
function getShaderHooks(hookFunctions, hookInjections) {
	let result = "";
	for (const hookName in hookFunctions) {
		const hookFunction = hookFunctions[hookName];
		result += `void ${hookFunction.signature} {\n`;
		if (hookFunction.header) result += `  ${hookFunction.header}`;
		if (hookInjections[hookName]) {
			const injections = hookInjections[hookName];
			injections.sort((a, b) => a.order - b.order);
			for (const injection of injections) result += `  ${injection.injection}\n`;
		}
		if (hookFunction.footer) result += `  ${hookFunction.footer}`;
		result += "}\n";
	}
	return result;
}
/**
* Parse string based hook functions
* And split per shader
*/
function normalizeShaderHooks(hookFunctions) {
	const result = {
		vertex: {},
		fragment: {}
	};
	for (const hookFunction of hookFunctions) {
		let opts;
		let hook;
		if (typeof hookFunction !== "string") {
			opts = hookFunction;
			hook = opts.hook;
		} else {
			opts = {};
			hook = hookFunction;
		}
		hook = hook.trim();
		const [shaderStage, signature] = hook.split(":");
		const name = hook.replace(/\(.+/, "");
		const normalizedHook = Object.assign(opts, { signature });
		switch (shaderStage) {
			case "vs":
				result.vertex[name] = normalizedHook;
				break;
			case "fs":
				result.fragment[name] = normalizedHook;
				break;
			default: throw new Error(shaderStage);
		}
	}
	return result;
}
//#endregion
//#region node_modules/@luma.gl/shadertools/dist/lib/glsl-utils/get-shader-info.js
/** Extracts information from shader source code */
function getShaderInfo(source, defaultName) {
	return {
		name: getShaderName(source, defaultName),
		language: "glsl",
		version: getShaderVersion(source)
	};
}
/** Extracts GLSLIFY style naming of shaders: `#define SHADER_NAME ...` */
function getShaderName(shader, defaultName = "unnamed") {
	const match = /#define[^\S\r\n]*SHADER_NAME[^\S\r\n]*([A-Za-z0-9_-]+)\s*/.exec(shader);
	return match ? match[1] : defaultName;
}
/** returns GLSL shader version of given shader string */
function getShaderVersion(source) {
	let version = 100;
	const words = source.match(/[^\s]+/g);
	if (words && words.length >= 2 && words[0] === "#version") {
		const parsedVersion = parseInt(words[1], 10);
		if (Number.isFinite(parsedVersion)) version = parsedVersion;
	}
	if (version !== 100 && version !== 300) throw new Error(`Invalid GLSL version ${version}`);
	return version;
}
//#endregion
//#region node_modules/@luma.gl/shadertools/dist/lib/shader-assembly/wgsl-binding-scan.js
var WGSL_BINDABLE_VARIABLE_PATTERN = "(?:var<\\s*(uniform|storage(?:\\s*,\\s*[A-Za-z_][A-Za-z0-9_]*)?)\\s*>|var)\\s+([A-Za-z_][A-Za-z0-9_]*)";
var WGSL_BINDING_DECLARATION_SEPARATOR_PATTERN = "\\s*";
var MODULE_WGSL_BINDING_DECLARATION_REGEXES = [new RegExp(`@binding\\(\\s*(auto|\\d+)\\s*\\)${WGSL_BINDING_DECLARATION_SEPARATOR_PATTERN}@group\\(\\s*(\\d+)\\s*\\)${WGSL_BINDING_DECLARATION_SEPARATOR_PATTERN}${WGSL_BINDABLE_VARIABLE_PATTERN}`, "g"), new RegExp(`@group\\(\\s*(\\d+)\\s*\\)${WGSL_BINDING_DECLARATION_SEPARATOR_PATTERN}@binding\\(\\s*(auto|\\d+)\\s*\\)${WGSL_BINDING_DECLARATION_SEPARATOR_PATTERN}${WGSL_BINDABLE_VARIABLE_PATTERN}`, "g")];
var WGSL_BINDING_DECLARATION_REGEXES = [new RegExp(`@binding\\(\\s*(auto|\\d+)\\s*\\)${WGSL_BINDING_DECLARATION_SEPARATOR_PATTERN}@group\\(\\s*(\\d+)\\s*\\)${WGSL_BINDING_DECLARATION_SEPARATOR_PATTERN}${WGSL_BINDABLE_VARIABLE_PATTERN}`, "g"), new RegExp(`@group\\(\\s*(\\d+)\\s*\\)${WGSL_BINDING_DECLARATION_SEPARATOR_PATTERN}@binding\\(\\s*(auto|\\d+)\\s*\\)${WGSL_BINDING_DECLARATION_SEPARATOR_PATTERN}${WGSL_BINDABLE_VARIABLE_PATTERN}`, "g")];
var WGSL_EXPLICIT_BINDING_DECLARATION_REGEXES = [new RegExp(`@binding\\(\\s*(\\d+)\\s*\\)${WGSL_BINDING_DECLARATION_SEPARATOR_PATTERN}@group\\(\\s*(\\d+)\\s*\\)${WGSL_BINDING_DECLARATION_SEPARATOR_PATTERN}${WGSL_BINDABLE_VARIABLE_PATTERN}`, "g"), new RegExp(`@group\\(\\s*(\\d+)\\s*\\)${WGSL_BINDING_DECLARATION_SEPARATOR_PATTERN}@binding\\(\\s*(\\d+)\\s*\\)${WGSL_BINDING_DECLARATION_SEPARATOR_PATTERN}${WGSL_BINDABLE_VARIABLE_PATTERN}`, "g")];
var WGSL_AUTO_BINDING_DECLARATION_REGEXES = [
	new RegExp(`@binding\\(\\s*(auto)\\s*\\)\\s*@group\\(\\s*(\\d+)\\s*\\)\\s*${WGSL_BINDABLE_VARIABLE_PATTERN}`, "g"),
	new RegExp(`@group\\(\\s*(\\d+)\\s*\\)\\s*@binding\\(\\s*(auto)\\s*\\)\\s*${WGSL_BINDABLE_VARIABLE_PATTERN}`, "g"),
	new RegExp(`@binding\\(\\s*(auto)\\s*\\)\\s*@group\\(\\s*(\\d+)\\s*\\)(?:[\\s\\n\\r]*@[A-Za-z_][^\\n\\r]*)*[\\s\\n\\r]*${WGSL_BINDABLE_VARIABLE_PATTERN}`, "g"),
	new RegExp(`@group\\(\\s*(\\d+)\\s*\\)\\s*@binding\\(\\s*(auto)\\s*\\)(?:[\\s\\n\\r]*@[A-Za-z_][^\\n\\r]*)*[\\s\\n\\r]*${WGSL_BINDABLE_VARIABLE_PATTERN}`, "g")
];
function maskWGSLComments(source) {
	const maskedCharacters = source.split("");
	let index = 0;
	let blockCommentDepth = 0;
	let inLineComment = false;
	let inString = false;
	let isEscaped = false;
	while (index < source.length) {
		const character = source[index];
		const nextCharacter = source[index + 1];
		if (inString) {
			if (isEscaped) isEscaped = false;
			else if (character === "\\") isEscaped = true;
			else if (character === "\"") inString = false;
			index++;
			continue;
		}
		if (inLineComment) {
			if (character === "\n" || character === "\r") inLineComment = false;
			else maskedCharacters[index] = " ";
			index++;
			continue;
		}
		if (blockCommentDepth > 0) {
			if (character === "/" && nextCharacter === "*") {
				maskedCharacters[index] = " ";
				maskedCharacters[index + 1] = " ";
				blockCommentDepth++;
				index += 2;
				continue;
			}
			if (character === "*" && nextCharacter === "/") {
				maskedCharacters[index] = " ";
				maskedCharacters[index + 1] = " ";
				blockCommentDepth--;
				index += 2;
				continue;
			}
			if (character !== "\n" && character !== "\r") maskedCharacters[index] = " ";
			index++;
			continue;
		}
		if (character === "\"") {
			inString = true;
			index++;
			continue;
		}
		if (character === "/" && nextCharacter === "/") {
			maskedCharacters[index] = " ";
			maskedCharacters[index + 1] = " ";
			inLineComment = true;
			index += 2;
			continue;
		}
		if (character === "/" && nextCharacter === "*") {
			maskedCharacters[index] = " ";
			maskedCharacters[index + 1] = " ";
			blockCommentDepth = 1;
			index += 2;
			continue;
		}
		index++;
	}
	return maskedCharacters.join("");
}
function getWGSLBindingDeclarationMatches(source, regexes) {
	const maskedSource = maskWGSLComments(source);
	const matches = [];
	for (const regex of regexes) {
		regex.lastIndex = 0;
		let match;
		match = regex.exec(maskedSource);
		while (match) {
			const isBindingFirst = regex === regexes[0];
			const index = match.index;
			const length = match[0].length;
			matches.push({
				match: source.slice(index, index + length),
				index,
				length,
				bindingToken: match[isBindingFirst ? 1 : 2],
				groupToken: match[isBindingFirst ? 2 : 1],
				accessDeclaration: match[3]?.trim(),
				name: match[4]
			});
			match = regex.exec(maskedSource);
		}
	}
	return matches.sort((left, right) => left.index - right.index);
}
function replaceWGSLBindingDeclarationMatches(source, regexes, replacer) {
	const matches = getWGSLBindingDeclarationMatches(source, regexes);
	if (!matches.length) return source;
	let relocatedSource = "";
	let lastIndex = 0;
	for (const match of matches) {
		relocatedSource += source.slice(lastIndex, match.index);
		relocatedSource += replacer(match);
		lastIndex = match.index + match.length;
	}
	relocatedSource += source.slice(lastIndex);
	return relocatedSource;
}
function hasWGSLAutoBinding(source) {
	return /@binding\(\s*auto\s*\)/.test(maskWGSLComments(source));
}
function getFirstWGSLAutoBindingDeclarationMatch(source, regexes) {
	return getWGSLBindingDeclarationMatches(source, regexes === MODULE_WGSL_BINDING_DECLARATION_REGEXES || regexes === WGSL_BINDING_DECLARATION_REGEXES ? WGSL_AUTO_BINDING_DECLARATION_REGEXES : regexes).find((declarationMatch) => declarationMatch.bindingToken === "auto");
}
//#endregion
//#region node_modules/@luma.gl/shadertools/dist/lib/shader-assembly/wgsl-binding-debug.js
var WGSL_BINDING_DEBUG_REGEXES = [new RegExp(`@binding\\(\\s*(\\d+)\\s*\\)\\s*@group\\(\\s*(\\d+)\\s*\\)\\s*${WGSL_BINDABLE_VARIABLE_PATTERN}\\s*:\\s*([^;]+);`, "g"), new RegExp(`@group\\(\\s*(\\d+)\\s*\\)\\s*@binding\\(\\s*(\\d+)\\s*\\)\\s*${WGSL_BINDABLE_VARIABLE_PATTERN}\\s*:\\s*([^;]+);`, "g")];
/** Builds a stable, table-friendly binding summary from assembled WGSL source. */
function getShaderBindingDebugRowsFromWGSL(source, bindingAssignments = []) {
	const maskedSource = maskWGSLComments(source);
	const assignmentMap = /* @__PURE__ */ new Map();
	for (const bindingAssignment of bindingAssignments) assignmentMap.set(getBindingAssignmentKey(bindingAssignment.name, bindingAssignment.group, bindingAssignment.location), bindingAssignment.moduleName);
	const rows = [];
	for (const regex of WGSL_BINDING_DEBUG_REGEXES) {
		regex.lastIndex = 0;
		let match;
		match = regex.exec(maskedSource);
		while (match) {
			const isBindingFirst = regex === WGSL_BINDING_DEBUG_REGEXES[0];
			const binding = Number(match[isBindingFirst ? 1 : 2]);
			const group = Number(match[isBindingFirst ? 2 : 1]);
			const accessDeclaration = match[3]?.trim();
			const name = match[4];
			const resourceType = match[5].trim();
			const moduleName = assignmentMap.get(getBindingAssignmentKey(name, group, binding));
			rows.push(normalizeShaderBindingDebugRow({
				name,
				group,
				binding,
				owner: moduleName ? "module" : "application",
				moduleName,
				accessDeclaration,
				resourceType
			}));
			match = regex.exec(maskedSource);
		}
	}
	return rows.sort((left, right) => {
		if (left.group !== right.group) return left.group - right.group;
		if (left.binding !== right.binding) return left.binding - right.binding;
		return left.name.localeCompare(right.name);
	});
}
function normalizeShaderBindingDebugRow(row) {
	const baseRow = {
		name: row.name,
		group: row.group,
		binding: row.binding,
		owner: row.owner,
		kind: "unknown",
		moduleName: row.moduleName,
		resourceType: row.resourceType
	};
	if (row.accessDeclaration) {
		const access = row.accessDeclaration.split(",").map((value) => value.trim());
		if (access[0] === "uniform") return {
			...baseRow,
			kind: "uniform",
			access: "uniform"
		};
		if (access[0] === "storage") {
			const storageAccess = access[1] || "read_write";
			return {
				...baseRow,
				kind: storageAccess === "read" ? "read-only-storage" : "storage",
				access: storageAccess
			};
		}
	}
	if (row.resourceType === "sampler" || row.resourceType === "sampler_comparison") return {
		...baseRow,
		kind: "sampler",
		samplerKind: row.resourceType === "sampler_comparison" ? "comparison" : "filtering"
	};
	if (row.resourceType.startsWith("texture_storage_")) return {
		...baseRow,
		kind: "storage-texture",
		access: getStorageTextureAccess(row.resourceType),
		viewDimension: getTextureViewDimension(row.resourceType)
	};
	if (row.resourceType.startsWith("texture_")) return {
		...baseRow,
		kind: "texture",
		viewDimension: getTextureViewDimension(row.resourceType),
		sampleType: getTextureSampleType(row.resourceType),
		multisampled: row.resourceType.startsWith("texture_multisampled_")
	};
	return baseRow;
}
function getBindingAssignmentKey(name, group, binding) {
	return `${group}:${binding}:${name}`;
}
function getTextureViewDimension(resourceType) {
	if (resourceType.includes("cube_array")) return "cube-array";
	if (resourceType.includes("2d_array")) return "2d-array";
	if (resourceType.includes("cube")) return "cube";
	if (resourceType.includes("3d")) return "3d";
	if (resourceType.includes("2d")) return "2d";
	if (resourceType.includes("1d")) return "1d";
}
function getTextureSampleType(resourceType) {
	if (resourceType.startsWith("texture_depth_")) return "depth";
	if (resourceType.includes("<i32>")) return "sint";
	if (resourceType.includes("<u32>")) return "uint";
	if (resourceType.includes("<f32>")) return "float";
}
function getStorageTextureAccess(resourceType) {
	return /,\s*([A-Za-z_][A-Za-z0-9_]*)\s*>$/.exec(resourceType)?.[1];
}
//#endregion
//#region node_modules/@luma.gl/shadertools/dist/lib/shader-assembly/assemble-shaders.js
var INJECT_SHADER_DECLARATIONS = `\n\n${DECLARATION_INJECT_MARKER}\n`;
var RESERVED_APPLICATION_GROUP_0_BINDING_LIMIT = 100;
/**
* Precision prologue to inject before functions are injected in shader
* TODO - extract any existing prologue in the fragment source and move it up...
*/
var FRAGMENT_SHADER_PROLOGUE = `\
precision highp float;
`;
/**
* Inject a list of shader modules into a single shader source for WGSL
*/
function assembleWGSLShader(options) {
	const modules = getShaderModuleDependencies(options.modules || []);
	const { source, bindingAssignments } = assembleShaderWGSL(options.platformInfo, {
		...options,
		source: options.source,
		stage: "vertex",
		modules
	});
	return {
		source,
		getUniforms: assembleGetUniforms(modules),
		bindingAssignments,
		bindingTable: getShaderBindingDebugRowsFromWGSL(source, bindingAssignments)
	};
}
/**
* Injects dependent shader module sources into pair of main vertex/fragment shader sources for GLSL
*/
function assembleGLSLShaderPair(options) {
	const { vs, fs } = options;
	const modules = getShaderModuleDependencies(options.modules || []);
	return {
		vs: assembleShaderGLSL(options.platformInfo, {
			...options,
			source: vs,
			stage: "vertex",
			modules
		}),
		fs: assembleShaderGLSL(options.platformInfo, {
			...options,
			source: fs,
			stage: "fragment",
			modules
		}),
		getUniforms: assembleGetUniforms(modules)
	};
}
/**
* Pulls together complete source code for either a vertex or a fragment shader
* adding prologues, requested module chunks, and any final injections.
* @param gl
* @param options
* @returns
*/
function assembleShaderWGSL(platformInfo, options) {
	const { source, stage, modules, hookFunctions = [], inject = {}, log } = options;
	assert$2(typeof source === "string", "shader source must be a string");
	const coreSource = source;
	let assembledSource = "";
	const hookFunctionMap = normalizeShaderHooks(hookFunctions);
	const hookInjections = {};
	const declInjections = {};
	const mainInjections = {};
	for (const key in inject) {
		const injection = typeof inject[key] === "string" ? {
			injection: inject[key],
			order: 0
		} : inject[key];
		const match = /^(v|f)s:(#)?([\w-]+)$/.exec(key);
		if (match) {
			const hash = match[2];
			const name = match[3];
			if (hash) if (name === "decl") declInjections[key] = [injection];
			else mainInjections[key] = [injection];
			else hookInjections[key] = [injection];
		} else mainInjections[key] = [injection];
	}
	const modulesToInject = modules;
	const applicationRelocation = relocateWGSLApplicationBindings(coreSource);
	const usedBindingsByGroup = getUsedBindingsByGroupFromApplicationWGSL(applicationRelocation.source);
	const reservedBindingKeysByGroup = reserveRegisteredModuleBindings(modulesToInject, options._bindingRegistry, usedBindingsByGroup);
	const bindingAssignments = [];
	for (const module of modulesToInject) {
		if (log) checkShaderModuleDeprecations(module, coreSource, log);
		const relocation = relocateWGSLModuleBindings(getShaderModuleSource(module, "wgsl", log), module, {
			usedBindingsByGroup,
			bindingRegistry: options._bindingRegistry,
			reservedBindingKeysByGroup
		});
		bindingAssignments.push(...relocation.bindingAssignments);
		const moduleSource = relocation.source;
		assembledSource += moduleSource;
		const injections = module.injections?.[stage] || {};
		for (const key in injections) {
			const match = /^(v|f)s:#([\w-]+)$/.exec(key);
			if (match) {
				const injectionType = match[2] === "decl" ? declInjections : mainInjections;
				injectionType[key] = injectionType[key] || [];
				injectionType[key].push(injections[key]);
			} else {
				hookInjections[key] = hookInjections[key] || [];
				hookInjections[key].push(injections[key]);
			}
		}
	}
	assembledSource += INJECT_SHADER_DECLARATIONS;
	assembledSource = injectShader(assembledSource, stage, declInjections);
	assembledSource += getShaderHooks(hookFunctionMap[stage], hookInjections);
	assembledSource += formatWGSLBindingAssignmentComments(bindingAssignments);
	assembledSource += applicationRelocation.source;
	assembledSource = injectShader(assembledSource, stage, mainInjections);
	assertNoUnresolvedAutoBindings(assembledSource);
	return {
		source: assembledSource,
		bindingAssignments
	};
}
/**
* Pulls together complete source code for either a vertex or a fragment shader
* adding prologues, requested module chunks, and any final injections.
* @param gl
* @param options
* @returns
*/
function assembleShaderGLSL(platformInfo, options) {
	const { source, stage, language = "glsl", modules, defines = {}, hookFunctions = [], inject = {}, prologue = true, log } = options;
	assert$2(typeof source === "string", "shader source must be a string");
	const sourceVersion = language === "glsl" ? getShaderInfo(source).version : -1;
	const targetVersion = platformInfo.shaderLanguageVersion;
	const sourceVersionDirective = sourceVersion === 100 ? "#version 100" : "#version 300 es";
	const coreSource = source.split("\n").slice(1).join("\n");
	const allDefines = {};
	modules.forEach((module) => {
		Object.assign(allDefines, module.defines);
	});
	Object.assign(allDefines, defines);
	let assembledSource = "";
	switch (language) {
		case "wgsl": break;
		case "glsl":
			assembledSource = prologue ? `\
${sourceVersionDirective}

// ----- PROLOGUE -------------------------
${`#define SHADER_TYPE_${stage.toUpperCase()}`}

${getPlatformShaderDefines(platformInfo)}
${stage === "fragment" ? FRAGMENT_SHADER_PROLOGUE : ""}

// ----- APPLICATION DEFINES -------------------------

${getApplicationDefines(allDefines)}

` : `${sourceVersionDirective}
`;
			break;
	}
	const hookFunctionMap = normalizeShaderHooks(hookFunctions);
	const hookInjections = {};
	const declInjections = {};
	const mainInjections = {};
	for (const key in inject) {
		const injection = typeof inject[key] === "string" ? {
			injection: inject[key],
			order: 0
		} : inject[key];
		const match = /^(v|f)s:(#)?([\w-]+)$/.exec(key);
		if (match) {
			const hash = match[2];
			const name = match[3];
			if (hash) if (name === "decl") declInjections[key] = [injection];
			else mainInjections[key] = [injection];
			else hookInjections[key] = [injection];
		} else mainInjections[key] = [injection];
	}
	for (const module of modules) {
		if (log) checkShaderModuleDeprecations(module, coreSource, log);
		const moduleSource = getShaderModuleSource(module, stage, log);
		assembledSource += moduleSource;
		const injections = module.instance?.normalizedInjections[stage] || {};
		for (const key in injections) {
			const match = /^(v|f)s:#([\w-]+)$/.exec(key);
			if (match) {
				const injectionType = match[2] === "decl" ? declInjections : mainInjections;
				injectionType[key] = injectionType[key] || [];
				injectionType[key].push(injections[key]);
			} else {
				hookInjections[key] = hookInjections[key] || [];
				hookInjections[key].push(injections[key]);
			}
		}
	}
	assembledSource += "// ----- MAIN SHADER SOURCE -------------------------";
	assembledSource += INJECT_SHADER_DECLARATIONS;
	assembledSource = injectShader(assembledSource, stage, declInjections);
	assembledSource += getShaderHooks(hookFunctionMap[stage], hookInjections);
	assembledSource += coreSource;
	assembledSource = injectShader(assembledSource, stage, mainInjections);
	if (language === "glsl" && sourceVersion !== targetVersion) assembledSource = transpileGLSLShader(assembledSource, stage);
	if (language === "glsl") warnIfGLSLUniformBlocksAreNotStd140(assembledSource, stage, log);
	return assembledSource.trim();
}
/**
* Returns a combined `getUniforms` covering the options for all the modules,
* the created function will pass on options to the inidividual `getUniforms`
* function of each shader module and combine the results into one object that
* can be passed to setUniforms.
* @param modules
* @returns
*/
function assembleGetUniforms(modules) {
	return function getUniforms(opts) {
		const uniforms = {};
		for (const module of modules) {
			const moduleUniforms = module.getUniforms?.(opts, uniforms);
			Object.assign(uniforms, moduleUniforms);
		}
		return uniforms;
	};
}
/**
* NOTE: Removed as id injection defeated caching of shaders
*
* Generate "glslify-compatible" SHADER_NAME defines
* These are understood by the GLSL error parsing function
* If id is provided and no SHADER_NAME constant is present in source, create one
unction getShaderNameDefine(options: {
id?: string;
source: string;
stage: 'vertex' | 'fragment';
}): string {
const {id, source, stage} = options;
const injectShaderName = id && source.indexOf('SHADER_NAME') === -1;
return injectShaderName
? `
#define SHADER_NAME ${id}_${stage}`
: '';
}
*/
/** Generates application defines from an object of key value pairs */
function getApplicationDefines(defines = {}) {
	let sourceText = "";
	for (const define in defines) {
		const value = defines[define];
		if (value || Number.isFinite(value)) sourceText += `#define ${define.toUpperCase()} ${defines[define]}\n`;
	}
	return sourceText;
}
/** Extracts the source code chunk for the specified shader type from the named shader module */
function getShaderModuleSource(module, stage, log) {
	let moduleSource;
	switch (stage) {
		case "vertex":
			moduleSource = module.vs || "";
			break;
		case "fragment":
			moduleSource = module.fs || "";
			break;
		case "wgsl":
			moduleSource = module.source || "";
			break;
		default: assert$2(false);
	}
	if (!module.name) throw new Error("Shader module must have a name");
	validateShaderModuleUniformLayout(module, stage, { log });
	const moduleName = module.name.toUpperCase().replace(/[^0-9a-z]/gi, "_");
	let source = `\
// ----- MODULE ${module.name} ---------------

`;
	if (stage !== "wgsl") source += `#define MODULE_${moduleName}\n`;
	source += `${moduleSource}\n`;
	return source;
}
function getUsedBindingsByGroupFromApplicationWGSL(source) {
	const usedBindingsByGroup = /* @__PURE__ */ new Map();
	for (const match of getWGSLBindingDeclarationMatches(source, WGSL_EXPLICIT_BINDING_DECLARATION_REGEXES)) {
		const location = Number(match.bindingToken);
		const group = Number(match.groupToken);
		validateApplicationWGSLBinding(group, location, match.name);
		registerUsedBindingLocation(usedBindingsByGroup, group, location, `application binding "${match.name}"`);
	}
	return usedBindingsByGroup;
}
function relocateWGSLApplicationBindings(source) {
	const declarationMatches = getWGSLBindingDeclarationMatches(source, WGSL_BINDING_DECLARATION_REGEXES);
	const usedBindingsByGroup = /* @__PURE__ */ new Map();
	for (const declarationMatch of declarationMatches) {
		if (declarationMatch.bindingToken === "auto") continue;
		const location = Number(declarationMatch.bindingToken);
		const group = Number(declarationMatch.groupToken);
		validateApplicationWGSLBinding(group, location, declarationMatch.name);
		registerUsedBindingLocation(usedBindingsByGroup, group, location, `application binding "${declarationMatch.name}"`);
	}
	const relocationState = { sawSupportedBindingDeclaration: declarationMatches.length > 0 };
	const relocatedSource = replaceWGSLBindingDeclarationMatches(source, WGSL_BINDING_DECLARATION_REGEXES, (declarationMatch) => relocateWGSLApplicationBindingMatch(declarationMatch, usedBindingsByGroup, relocationState));
	if (hasWGSLAutoBinding(source) && !relocationState.sawSupportedBindingDeclaration) throw new Error("Unsupported @binding(auto) declaration form in application WGSL. Use adjacent \"@group(N)\" and \"@binding(auto)\" decorators followed by a bindable \"var\" declaration.");
	return { source: relocatedSource };
}
function relocateWGSLModuleBindings(moduleSource, module, context) {
	const bindingAssignments = [];
	const relocationState = {
		sawSupportedBindingDeclaration: getWGSLBindingDeclarationMatches(moduleSource, MODULE_WGSL_BINDING_DECLARATION_REGEXES).length > 0,
		nextHintedBindingLocation: typeof module.firstBindingSlot === "number" ? module.firstBindingSlot : null
	};
	const relocatedSource = replaceWGSLBindingDeclarationMatches(moduleSource, MODULE_WGSL_BINDING_DECLARATION_REGEXES, (declarationMatch) => relocateWGSLModuleBindingMatch(declarationMatch, {
		module,
		context,
		bindingAssignments,
		relocationState
	}));
	if (hasWGSLAutoBinding(moduleSource) && !relocationState.sawSupportedBindingDeclaration) throw new Error(`Unsupported @binding(auto) declaration form in module "${module.name}". Use adjacent "@group(N)" and "@binding(auto)" decorators followed by a bindable "var" declaration.`);
	return {
		source: relocatedSource,
		bindingAssignments
	};
}
function relocateWGSLModuleBindingMatch(declarationMatch, params) {
	const { module, context, bindingAssignments, relocationState } = params;
	const { match, bindingToken, groupToken, name } = declarationMatch;
	const group = Number(groupToken);
	if (bindingToken === "auto") {
		const registryKey = getBindingRegistryKey(group, module.name, name);
		const registryLocation = context.bindingRegistry?.get(registryKey);
		const location = registryLocation !== void 0 ? registryLocation : relocationState.nextHintedBindingLocation === null ? allocateAutoBindingLocation(group, context.usedBindingsByGroup) : allocateAutoBindingLocation(group, context.usedBindingsByGroup, relocationState.nextHintedBindingLocation);
		validateModuleWGSLBinding(module.name, group, location, name);
		if (registryLocation !== void 0 && claimReservedBindingLocation(context.reservedBindingKeysByGroup, group, location, registryKey)) {
			bindingAssignments.push({
				moduleName: module.name,
				name,
				group,
				location
			});
			return match.replace(/@binding\(\s*auto\s*\)/, `@binding(${location})`);
		}
		registerUsedBindingLocation(context.usedBindingsByGroup, group, location, `module "${module.name}" binding "${name}"`);
		context.bindingRegistry?.set(registryKey, location);
		bindingAssignments.push({
			moduleName: module.name,
			name,
			group,
			location
		});
		if (relocationState.nextHintedBindingLocation !== null && registryLocation === void 0) relocationState.nextHintedBindingLocation = location + 1;
		return match.replace(/@binding\(\s*auto\s*\)/, `@binding(${location})`);
	}
	const location = Number(bindingToken);
	validateModuleWGSLBinding(module.name, group, location, name);
	registerUsedBindingLocation(context.usedBindingsByGroup, group, location, `module "${module.name}" binding "${name}"`);
	bindingAssignments.push({
		moduleName: module.name,
		name,
		group,
		location
	});
	return match;
}
function relocateWGSLApplicationBindingMatch(declarationMatch, usedBindingsByGroup, relocationState) {
	const { match, bindingToken, groupToken, name } = declarationMatch;
	const group = Number(groupToken);
	if (bindingToken === "auto") {
		const location = allocateApplicationAutoBindingLocation(group, usedBindingsByGroup);
		validateApplicationWGSLBinding(group, location, name);
		registerUsedBindingLocation(usedBindingsByGroup, group, location, `application binding "${name}"`);
		return match.replace(/@binding\(\s*auto\s*\)/, `@binding(${location})`);
	}
	relocationState.sawSupportedBindingDeclaration = true;
	return match;
}
function reserveRegisteredModuleBindings(modules, bindingRegistry, usedBindingsByGroup) {
	const reservedBindingKeysByGroup = /* @__PURE__ */ new Map();
	if (!bindingRegistry) return reservedBindingKeysByGroup;
	for (const module of modules) for (const binding of getModuleWGSLBindingDeclarations(module)) {
		const registryKey = getBindingRegistryKey(binding.group, module.name, binding.name);
		const location = bindingRegistry.get(registryKey);
		if (location !== void 0) {
			const reservedBindingKeys = reservedBindingKeysByGroup.get(binding.group) || /* @__PURE__ */ new Map();
			const existingReservation = reservedBindingKeys.get(location);
			if (existingReservation && existingReservation !== registryKey) throw new Error(`Duplicate WGSL binding reservation for modules "${existingReservation}" and "${registryKey}": group ${binding.group}, binding ${location}.`);
			registerUsedBindingLocation(usedBindingsByGroup, binding.group, location, `registered module binding "${registryKey}"`);
			reservedBindingKeys.set(location, registryKey);
			reservedBindingKeysByGroup.set(binding.group, reservedBindingKeys);
		}
	}
	return reservedBindingKeysByGroup;
}
function claimReservedBindingLocation(reservedBindingKeysByGroup, group, location, registryKey) {
	const reservedBindingKeys = reservedBindingKeysByGroup.get(group);
	if (!reservedBindingKeys) return false;
	const reservedKey = reservedBindingKeys.get(location);
	if (!reservedKey) return false;
	if (reservedKey !== registryKey) throw new Error(`Registered module binding "${registryKey}" collided with "${reservedKey}": group ${group}, binding ${location}.`);
	return true;
}
function getModuleWGSLBindingDeclarations(module) {
	const declarations = [];
	const moduleSource = module.source || "";
	for (const match of getWGSLBindingDeclarationMatches(moduleSource, MODULE_WGSL_BINDING_DECLARATION_REGEXES)) declarations.push({
		name: match.name,
		group: Number(match.groupToken)
	});
	return declarations;
}
function validateApplicationWGSLBinding(group, location, name) {
	if (group === 0 && location >= RESERVED_APPLICATION_GROUP_0_BINDING_LIMIT) throw new Error(`Application binding "${name}" in group 0 uses reserved binding ${location}. Application-owned explicit group-0 bindings must stay below ${RESERVED_APPLICATION_GROUP_0_BINDING_LIMIT}.`);
}
function validateModuleWGSLBinding(moduleName, group, location, name) {
	if (group === 0 && location < RESERVED_APPLICATION_GROUP_0_BINDING_LIMIT) throw new Error(`Module "${moduleName}" binding "${name}" in group 0 uses reserved application binding ${location}. Module-owned explicit group-0 bindings must be ${RESERVED_APPLICATION_GROUP_0_BINDING_LIMIT} or higher.`);
}
function registerUsedBindingLocation(usedBindingsByGroup, group, location, label) {
	const usedBindings = usedBindingsByGroup.get(group) || /* @__PURE__ */ new Set();
	if (usedBindings.has(location)) throw new Error(`Duplicate WGSL binding assignment for ${label}: group ${group}, binding ${location}.`);
	usedBindings.add(location);
	usedBindingsByGroup.set(group, usedBindings);
}
function allocateAutoBindingLocation(group, usedBindingsByGroup, preferredBindingLocation) {
	const usedBindings = usedBindingsByGroup.get(group) || /* @__PURE__ */ new Set();
	let nextBinding = preferredBindingLocation ?? (group === 0 ? RESERVED_APPLICATION_GROUP_0_BINDING_LIMIT : usedBindings.size > 0 ? Math.max(...usedBindings) + 1 : 0);
	while (usedBindings.has(nextBinding)) nextBinding++;
	return nextBinding;
}
function allocateApplicationAutoBindingLocation(group, usedBindingsByGroup) {
	const usedBindings = usedBindingsByGroup.get(group) || /* @__PURE__ */ new Set();
	let nextBinding = 0;
	while (usedBindings.has(nextBinding)) nextBinding++;
	return nextBinding;
}
function assertNoUnresolvedAutoBindings(source) {
	const unresolvedBinding = getFirstWGSLAutoBindingDeclarationMatch(source, MODULE_WGSL_BINDING_DECLARATION_REGEXES);
	if (!unresolvedBinding) return;
	const moduleName = getWGSLModuleNameAtIndex(source, unresolvedBinding.index);
	if (moduleName) throw new Error(`Unresolved @binding(auto) for module "${moduleName}" binding "${unresolvedBinding.name}" remained in assembled WGSL source.`);
	if (isInApplicationWGSLSection(source, unresolvedBinding.index)) throw new Error(`Unresolved @binding(auto) for application binding "${unresolvedBinding.name}" remained in assembled WGSL source.`);
	throw new Error(`Unresolved @binding(auto) remained in assembled WGSL source near "${formatWGSLSourceSnippet(unresolvedBinding.match)}".`);
}
function formatWGSLBindingAssignmentComments(bindingAssignments) {
	if (bindingAssignments.length === 0) return "";
	let source = "// ----- MODULE WGSL BINDING ASSIGNMENTS ---------------\n";
	for (const bindingAssignment of bindingAssignments) source += `// ${bindingAssignment.moduleName}.${bindingAssignment.name} -> @group(${bindingAssignment.group}) @binding(${bindingAssignment.location})\n`;
	source += "\n";
	return source;
}
function getBindingRegistryKey(group, moduleName, bindingName) {
	return `${group}:${moduleName}:${bindingName}`;
}
function getWGSLModuleNameAtIndex(source, index) {
	const moduleHeaderRegex = /^\/\/ ----- MODULE ([^\n]+) ---------------$/gm;
	let moduleName;
	let match;
	match = moduleHeaderRegex.exec(source);
	while (match && match.index <= index) {
		moduleName = match[1];
		match = moduleHeaderRegex.exec(source);
	}
	return moduleName;
}
function isInApplicationWGSLSection(source, index) {
	const injectionMarkerIndex = source.indexOf(INJECT_SHADER_DECLARATIONS);
	return injectionMarkerIndex >= 0 ? index > injectionMarkerIndex : true;
}
function formatWGSLSourceSnippet(source) {
	return source.replace(/\s+/g, " ").trim();
}
//#endregion
//#region node_modules/@luma.gl/shadertools/dist/lib/preprocessor/preprocessor.js
var DEFINE_NAME_PATTERN = "([a-zA-Z_][a-zA-Z0-9_]*)";
var IFDEF_REGEXP = new RegExp(`^\\s*\\#\\s*ifdef\\s*${DEFINE_NAME_PATTERN}\\s*$`);
var IFNDEF_REGEXP = new RegExp(`^\\s*\\#\\s*ifndef\\s*${DEFINE_NAME_PATTERN}\\s*(?:\\/\\/.*)?$`);
var ELSE_REGEXP = /^\s*\#\s*else\s*(?:\/\/.*)?$/;
var ENDIF_REGEXP = /^\s*\#\s*endif\s*$/;
var IFDEF_WITH_COMMENT_REGEXP = new RegExp(`^\\s*\\#\\s*ifdef\\s*${DEFINE_NAME_PATTERN}\\s*(?:\\/\\/.*)?$`);
var ENDIF_WITH_COMMENT_REGEXP = /^\s*\#\s*endif\s*(?:\/\/.*)?$/;
function preprocess(source, options) {
	const lines = source.split("\n");
	const output = [];
	const conditionalStack = [];
	let conditional = true;
	for (const line of lines) {
		const matchIf = line.match(IFDEF_WITH_COMMENT_REGEXP) || line.match(IFDEF_REGEXP);
		const matchIfNot = line.match(IFNDEF_REGEXP);
		const matchElse = line.match(ELSE_REGEXP);
		const matchEnd = line.match(ENDIF_WITH_COMMENT_REGEXP) || line.match(ENDIF_REGEXP);
		if (matchIf || matchIfNot) {
			const defineName = (matchIf || matchIfNot)?.[1];
			const defineValue = Boolean(options?.defines?.[defineName]);
			const branchTaken = matchIf ? defineValue : !defineValue;
			const active = conditional && branchTaken;
			conditionalStack.push({
				parentActive: conditional,
				branchTaken,
				active
			});
			conditional = active;
		} else if (matchElse) {
			const currentConditional = conditionalStack[conditionalStack.length - 1];
			if (!currentConditional) throw new Error("Encountered #else without matching #ifdef or #ifndef");
			currentConditional.active = currentConditional.parentActive && !currentConditional.branchTaken;
			currentConditional.branchTaken = true;
			conditional = currentConditional.active;
		} else if (matchEnd) {
			conditionalStack.pop();
			conditional = conditionalStack.length ? conditionalStack[conditionalStack.length - 1].active : true;
		} else if (conditional) output.push(line);
	}
	if (conditionalStack.length > 0) throw new Error("Unterminated conditional block in shader source");
	return output.join("\n");
}
//#endregion
//#region node_modules/@luma.gl/shadertools/dist/lib/shader-assembler.js
/**
* A stateful version of `assembleShaders` that can be used to assemble shaders.
* Supports setting of default modules and hooks.
*/
var ShaderAssembler = class ShaderAssembler {
	/** Default ShaderAssembler instance */
	static defaultShaderAssembler;
	/** Hook functions */
	_hookFunctions = [];
	/** Shader modules */
	_defaultModules = [];
	/** Stable per-run WGSL auto-binding assignments keyed by group/module/binding. */
	_wgslBindingRegistry = /* @__PURE__ */ new Map();
	/**
	* A default shader assembler instance - the natural place to register default modules and hooks
	* @returns
	*/
	static getDefaultShaderAssembler() {
		ShaderAssembler.defaultShaderAssembler = ShaderAssembler.defaultShaderAssembler || new ShaderAssembler();
		return ShaderAssembler.defaultShaderAssembler;
	}
	/**
	* Add a default module that does not have to be provided with every call to assembleShaders()
	*/
	addDefaultModule(module) {
		if (!this._defaultModules.find((m) => m.name === (typeof module === "string" ? module : module.name))) this._defaultModules.push(module);
	}
	/**
	* Remove a default module
	*/
	removeDefaultModule(module) {
		const moduleName = typeof module === "string" ? module : module.name;
		this._defaultModules = this._defaultModules.filter((m) => m.name !== moduleName);
	}
	/**
	* Register a shader hook
	* @param hook
	* @param opts
	*/
	addShaderHook(hook, opts) {
		if (opts) hook = Object.assign(opts, { hook });
		this._hookFunctions.push(hook);
	}
	/**
	* Assemble a WGSL unified shader
	* @param platformInfo
	* @param props
	* @returns
	*/
	assembleWGSLShader(props) {
		const modules = this._getModuleList(props.modules);
		const hookFunctions = this._hookFunctions;
		const { source, getUniforms, bindingAssignments } = assembleWGSLShader({
			...props,
			source: props.source,
			_bindingRegistry: this._wgslBindingRegistry,
			modules,
			hookFunctions
		});
		const defines = {
			...modules.reduce((accumulator, module) => {
				Object.assign(accumulator, module.defines);
				return accumulator;
			}, {}),
			...props.defines
		};
		const preprocessedSource = props.platformInfo.shaderLanguage === "wgsl" ? preprocess(source, { defines }) : source;
		return {
			source: preprocessedSource,
			getUniforms,
			modules,
			bindingAssignments,
			bindingTable: getShaderBindingDebugRowsFromWGSL(preprocessedSource, bindingAssignments)
		};
	}
	/**
	* Assemble a pair of shaders into a single shader program
	* @param platformInfo
	* @param props
	* @returns
	*/
	assembleGLSLShaderPair(props) {
		const modules = this._getModuleList(props.modules);
		const hookFunctions = this._hookFunctions;
		return {
			...assembleGLSLShaderPair({
				...props,
				vs: props.vs,
				fs: props.fs,
				modules,
				hookFunctions
			}),
			modules
		};
	}
	/**
	* Dedupe and combine with default modules
	*/
	_getModuleList(appModules = []) {
		const modules = new Array(this._defaultModules.length + appModules.length);
		const seen = {};
		let count = 0;
		for (let i = 0, len = this._defaultModules.length; i < len; ++i) {
			const module = this._defaultModules[i];
			const name = module.name;
			modules[count++] = module;
			seen[name] = true;
		}
		for (let i = 0, len = appModules.length; i < len; ++i) {
			const module = appModules[i];
			const name = module.name;
			if (!seen[name]) {
				modules[count++] = module;
				seen[name] = true;
			}
		}
		modules.length = count;
		initializeShaderModules(modules);
		return modules;
	}
};
1 / Math.PI * 180;
1 / 180 * Math.PI;
globalThis.mathgl = globalThis.mathgl || { config: {
	EPSILON: 1e-12,
	debug: false,
	precision: 4,
	printTypes: false,
	printDegrees: false,
	printRowMajor: true,
	_cartographicRadians: false
} };
var config = globalThis.mathgl.config;
/**
* Formats a value into a string
* @param value
* @param param1
* @returns
*/
function formatValue(value, { precision = config.precision } = {}) {
	value = round(value);
	return `${parseFloat(value.toPrecision(precision))}`;
}
/**
* Check if value is an "array"
* Returns `true` if value is either an array or a typed array
* Note: returns `false` for `ArrayBuffer` and `DataView` instances
* @note isTypedArray and isNumericArray are often more useful in TypeScript
*/
function isArray(value) {
	return Array.isArray(value) || ArrayBuffer.isView(value) && !(value instanceof DataView);
}
function clamp$1(value, min, max) {
	return map(value, (value) => Math.max(min, Math.min(max, value)));
}
function lerp$3(a, b, t) {
	if (isArray(a)) return a.map((ai, i) => lerp$3(ai, b[i], t));
	return t * b + (1 - t) * a;
}
/**
* Compares any two math objects, using `equals` method if available.
* @param a
* @param b
* @param epsilon
* @returns
*/
function equals(a, b, epsilon) {
	const oldEpsilon = config.EPSILON;
	if (epsilon) config.EPSILON = epsilon;
	try {
		if (a === b) return true;
		if (isArray(a) && isArray(b)) {
			if (a.length !== b.length) return false;
			for (let i = 0; i < a.length; ++i) if (!equals(a[i], b[i])) return false;
			return true;
		}
		if (a && a.equals) return a.equals(b);
		if (b && b.equals) return b.equals(a);
		if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) <= config.EPSILON * Math.max(1, Math.abs(a), Math.abs(b));
		return false;
	} finally {
		config.EPSILON = oldEpsilon;
	}
}
function round(value) {
	return Math.round(value / config.EPSILON) * config.EPSILON;
}
function duplicateArray(array) {
	return array.clone ? array.clone() : new Array(array.length);
}
function map(value, func, result) {
	if (isArray(value)) {
		const array = value;
		result = result || duplicateArray(array);
		for (let i = 0; i < result.length && i < array.length; ++i) {
			const val = typeof value === "number" ? value : value[i];
			result[i] = func(val, i, result);
		}
		return result;
	}
	return func(value);
}
//#endregion
//#region node_modules/@math.gl/core/dist/classes/base/math-array.js
/** Base class for vectors and matrices */
var MathArray = class extends Array {
	/**
	* Clone the current object
	* @returns a new copy of this object
	*/
	clone() {
		return new this.constructor().copy(this);
	}
	fromArray(array, offset = 0) {
		for (let i = 0; i < this.ELEMENTS; ++i) this[i] = array[i + offset];
		return this.check();
	}
	toArray(targetArray = [], offset = 0) {
		for (let i = 0; i < this.ELEMENTS; ++i) targetArray[offset + i] = this[i];
		return targetArray;
	}
	toObject(targetObject) {
		return targetObject;
	}
	from(arrayOrObject) {
		return Array.isArray(arrayOrObject) ? this.copy(arrayOrObject) : this.fromObject(arrayOrObject);
	}
	to(arrayOrObject) {
		if (arrayOrObject === this) return this;
		return isArray(arrayOrObject) ? this.toArray(arrayOrObject) : this.toObject(arrayOrObject);
	}
	toTarget(target) {
		return target ? this.to(target) : this;
	}
	/** @deprecated */
	toFloat32Array() {
		return new Float32Array(this);
	}
	toString() {
		return this.formatString(config);
	}
	/** Formats string according to options */
	formatString(opts) {
		let string = "";
		for (let i = 0; i < this.ELEMENTS; ++i) string += (i > 0 ? ", " : "") + formatValue(this[i], opts);
		return `${opts.printTypes ? this.constructor.name : ""}[${string}]`;
	}
	equals(array) {
		if (!array || this.length !== array.length) return false;
		for (let i = 0; i < this.ELEMENTS; ++i) if (!equals(this[i], array[i])) return false;
		return true;
	}
	exactEquals(array) {
		if (!array || this.length !== array.length) return false;
		for (let i = 0; i < this.ELEMENTS; ++i) if (this[i] !== array[i]) return false;
		return true;
	}
	/** Negates all values in this object */
	negate() {
		for (let i = 0; i < this.ELEMENTS; ++i) this[i] = -this[i];
		return this.check();
	}
	lerp(a, b, t) {
		if (t === void 0) return this.lerp(this, a, b);
		for (let i = 0; i < this.ELEMENTS; ++i) {
			const ai = a[i];
			const endValue = typeof b === "number" ? b : b[i];
			this[i] = ai + t * (endValue - ai);
		}
		return this.check();
	}
	/** Minimal */
	min(vector) {
		for (let i = 0; i < this.ELEMENTS; ++i) this[i] = Math.min(vector[i], this[i]);
		return this.check();
	}
	/** Maximal */
	max(vector) {
		for (let i = 0; i < this.ELEMENTS; ++i) this[i] = Math.max(vector[i], this[i]);
		return this.check();
	}
	clamp(minVector, maxVector) {
		for (let i = 0; i < this.ELEMENTS; ++i) this[i] = Math.min(Math.max(this[i], minVector[i]), maxVector[i]);
		return this.check();
	}
	add(...vectors) {
		for (const vector of vectors) for (let i = 0; i < this.ELEMENTS; ++i) this[i] += vector[i];
		return this.check();
	}
	subtract(...vectors) {
		for (const vector of vectors) for (let i = 0; i < this.ELEMENTS; ++i) this[i] -= vector[i];
		return this.check();
	}
	scale(scale) {
		if (typeof scale === "number") for (let i = 0; i < this.ELEMENTS; ++i) this[i] *= scale;
		else for (let i = 0; i < this.ELEMENTS && i < scale.length; ++i) this[i] *= scale[i];
		return this.check();
	}
	/**
	* Multiplies all elements by `scale`
	* Note: `Matrix4.multiplyByScalar` only scales its 3x3 "minor"
	*/
	multiplyByScalar(scalar) {
		for (let i = 0; i < this.ELEMENTS; ++i) this[i] *= scalar;
		return this.check();
	}
	/** Throws an error if array length is incorrect or contains illegal values */
	check() {
		if (config.debug && !this.validate()) throw new Error(`math.gl: ${this.constructor.name} some fields set to invalid numbers'`);
		return this;
	}
	/** Returns false if the array length is incorrect or contains illegal values */
	validate() {
		let valid = this.length === this.ELEMENTS;
		for (let i = 0; i < this.ELEMENTS; ++i) valid = valid && Number.isFinite(this[i]);
		return valid;
	}
	/** @deprecated */
	sub(a) {
		return this.subtract(a);
	}
	/** @deprecated */
	setScalar(a) {
		for (let i = 0; i < this.ELEMENTS; ++i) this[i] = a;
		return this.check();
	}
	/** @deprecated */
	addScalar(a) {
		for (let i = 0; i < this.ELEMENTS; ++i) this[i] += a;
		return this.check();
	}
	/** @deprecated */
	subScalar(a) {
		return this.addScalar(-a);
	}
	/** @deprecated */
	multiplyScalar(scalar) {
		for (let i = 0; i < this.ELEMENTS; ++i) this[i] *= scalar;
		return this.check();
	}
	/** @deprecated */
	divideScalar(a) {
		return this.multiplyByScalar(1 / a);
	}
	/** @deprecated */
	clampScalar(min, max) {
		for (let i = 0; i < this.ELEMENTS; ++i) this[i] = Math.min(Math.max(this[i], min), max);
		return this.check();
	}
	/** @deprecated */
	get elements() {
		return this;
	}
};
//#endregion
//#region node_modules/@math.gl/core/dist/lib/validators.js
function validateVector(v, length) {
	if (v.length !== length) return false;
	for (let i = 0; i < v.length; ++i) if (!Number.isFinite(v[i])) return false;
	return true;
}
function checkNumber(value) {
	if (!Number.isFinite(value)) throw new Error(`Invalid number ${JSON.stringify(value)}`);
	return value;
}
function checkVector(v, length, callerName = "") {
	if (config.debug && !validateVector(v, length)) throw new Error(`math.gl: ${callerName} some fields set to invalid numbers'`);
	return v;
}
//#endregion
//#region node_modules/@math.gl/core/dist/lib/assert.js
function assert$1(condition, message) {
	if (!condition) throw new Error(`math.gl assertion ${message}`);
}
//#endregion
//#region node_modules/@math.gl/core/dist/classes/base/vector.js
/** Base class for vectors with at least 2 elements */
var Vector = class extends MathArray {
	get x() {
		return this[0];
	}
	set x(value) {
		this[0] = checkNumber(value);
	}
	get y() {
		return this[1];
	}
	set y(value) {
		this[1] = checkNumber(value);
	}
	/**
	* Returns the length of the vector from the origin to the point described by this vector
	*
	* @note `length` is a reserved word for Arrays, so `v.length()` will return number of elements
	* Instead we provide `len` and `magnitude`
	*/
	len() {
		return Math.sqrt(this.lengthSquared());
	}
	/**
	* Returns the length of the vector from the origin to the point described by this vector
	*/
	magnitude() {
		return this.len();
	}
	/**
	* Returns the squared length of the vector from the origin to the point described by this vector
	*/
	lengthSquared() {
		let length = 0;
		for (let i = 0; i < this.ELEMENTS; ++i) length += this[i] * this[i];
		return length;
	}
	/**
	* Returns the squared length of the vector from the origin to the point described by this vector
	*/
	magnitudeSquared() {
		return this.lengthSquared();
	}
	distance(mathArray) {
		return Math.sqrt(this.distanceSquared(mathArray));
	}
	distanceSquared(mathArray) {
		let length = 0;
		for (let i = 0; i < this.ELEMENTS; ++i) {
			const dist = this[i] - mathArray[i];
			length += dist * dist;
		}
		return checkNumber(length);
	}
	dot(mathArray) {
		let product = 0;
		for (let i = 0; i < this.ELEMENTS; ++i) product += this[i] * mathArray[i];
		return checkNumber(product);
	}
	normalize() {
		const length = this.magnitude();
		if (length !== 0) for (let i = 0; i < this.ELEMENTS; ++i) this[i] /= length;
		return this.check();
	}
	multiply(...vectors) {
		for (const vector of vectors) for (let i = 0; i < this.ELEMENTS; ++i) this[i] *= vector[i];
		return this.check();
	}
	divide(...vectors) {
		for (const vector of vectors) for (let i = 0; i < this.ELEMENTS; ++i) this[i] /= vector[i];
		return this.check();
	}
	lengthSq() {
		return this.lengthSquared();
	}
	distanceTo(vector) {
		return this.distance(vector);
	}
	distanceToSquared(vector) {
		return this.distanceSquared(vector);
	}
	getComponent(i) {
		assert$1(i >= 0 && i < this.ELEMENTS, "index is out of range");
		return checkNumber(this[i]);
	}
	setComponent(i, value) {
		assert$1(i >= 0 && i < this.ELEMENTS, "index is out of range");
		this[i] = value;
		return this.check();
	}
	addVectors(a, b) {
		return this.copy(a).add(b);
	}
	subVectors(a, b) {
		return this.copy(a).subtract(b);
	}
	multiplyVectors(a, b) {
		return this.copy(a).multiply(b);
	}
	addScaledVector(a, b) {
		return this.add(new this.constructor(a).multiplyScalar(b));
	}
};
var ARRAY_TYPE = typeof Float32Array !== "undefined" ? Float32Array : Array;
Math.PI / 180;
//#endregion
//#region node_modules/@math.gl/core/dist/gl-matrix/vec2.js
/**
* 2 Dimensional Vector
* @module vec2
*/
/**
* Creates a new, empty vec2
*
* @returns a new 2D vector
*/
function create$2() {
	const out = new ARRAY_TYPE(2);
	if (ARRAY_TYPE != Float32Array) {
		out[0] = 0;
		out[1] = 0;
	}
	return out;
}
/**
* Adds two vec2's
*
* @param {NumericArray} out the receiving vector
* @param {Readonly<NumericArray>} a the first operand
* @param {Readonly<NumericArray>} b the second operand
* @returns {NumericArray} out
*/
function add(out, a, b) {
	out[0] = a[0] + b[0];
	out[1] = a[1] + b[1];
	return out;
}
/**
* Subtracts vector b from vector a
*
* @param {NumericArray} out the receiving vector
* @param {Readonly<NumericArray>} a the first operand
* @param {Readonly<NumericArray>} b the second operand
* @returns {NumericArray} out
*/
function subtract$1(out, a, b) {
	out[0] = a[0] - b[0];
	out[1] = a[1] - b[1];
	return out;
}
/**
* Scales a vec2 by a scalar number
*
* @param {NumericArray} out the receiving vector
* @param {Readonly<NumericArray>} a the vector to scale
* @param {Number} b amount to scale the vector by
* @returns {NumericArray} out
*/
function scale$2(out, a, b) {
	out[0] = a[0] * b;
	out[1] = a[1] * b;
	return out;
}
/**
* Calculates the length of a vec2
*
* @param {Readonly<NumericArray>} a vector to calculate length of
* @returns {Number} length of a
*/
function length$1(a) {
	const x = a[0];
	const y = a[1];
	return Math.sqrt(x * x + y * y);
}
/**
* Negates the components of a vec2
*
* @param {NumericArray} out the receiving vector
* @param {Readonly<NumericArray>} a vector to negate
* @returns {NumericArray} out
*/
function negate$1(out, a) {
	out[0] = -a[0];
	out[1] = -a[1];
	return out;
}
/**
* Performs a linear interpolation between two vec2's
*
* @param {NumericArray} out the receiving vector
* @param {Readonly<NumericArray>} a the first operand
* @param {Readonly<NumericArray>} b the second operand
* @param {Number} t interpolation amount, in the range [0-1], between the two inputs
* @returns {NumericArray} out
*/
function lerp$2(out, a, b, t) {
	const ax = a[0];
	const ay = a[1];
	out[0] = ax + t * (b[0] - ax);
	out[1] = ay + t * (b[1] - ay);
	return out;
}
/**
* Transforms the vec2 with a mat4
* 3rd vector component is implicitly '0'
* 4th vector component is implicitly '1'
*
* @param {NumericArray} out the receiving vector
* @param {Readonly<NumericArray>} a the vector to transform
* @param {ReadonlyMat4} m matrix to transform with
* @returns {NumericArray} out
*/
function transformMat4$2(out, a, m) {
	const x = a[0];
	const y = a[1];
	out[0] = m[0] * x + m[4] * y + m[12];
	out[1] = m[1] * x + m[5] * y + m[13];
	return out;
}
/**
* Alias for {@link vec2.subtract}
* @function
*/
var sub$1 = subtract$1;
(function() {
	const vec = create$2();
	return function(a, stride, offset, count, fn, arg) {
		let i;
		let l;
		if (!stride) stride = 2;
		if (!offset) offset = 0;
		if (count) l = Math.min(count * stride + offset, a.length);
		else l = a.length;
		for (i = offset; i < l; i += stride) {
			vec[0] = a[i];
			vec[1] = a[i + 1];
			fn(vec, vec, arg);
			a[i] = vec[0];
			a[i + 1] = vec[1];
		}
		return a;
	};
})();
//#endregion
//#region node_modules/@math.gl/core/dist/lib/gl-matrix-extras.js
function vec2_transformMat4AsVector(out, a, m) {
	const x = a[0];
	const y = a[1];
	const w = m[3] * x + m[7] * y || 1;
	out[0] = (m[0] * x + m[4] * y) / w;
	out[1] = (m[1] * x + m[5] * y) / w;
	return out;
}
function vec3_transformMat4AsVector(out, a, m) {
	const x = a[0];
	const y = a[1];
	const z = a[2];
	const w = m[3] * x + m[7] * y + m[11] * z || 1;
	out[0] = (m[0] * x + m[4] * y + m[8] * z) / w;
	out[1] = (m[1] * x + m[5] * y + m[9] * z) / w;
	out[2] = (m[2] * x + m[6] * y + m[10] * z) / w;
	return out;
}
function vec3_transformMat2(out, a, m) {
	const x = a[0];
	const y = a[1];
	out[0] = m[0] * x + m[2] * y;
	out[1] = m[1] * x + m[3] * y;
	out[2] = a[2];
	return out;
}
//#endregion
//#region node_modules/@math.gl/core/dist/gl-matrix/vec3.js
/**
* 3 Dimensional Vector
* @module vec3
*/
/**
* Creates a new, empty vec3
*
* @returns {vec3} a new 3D vector
*/
function create$1() {
	const out = new ARRAY_TYPE(3);
	if (ARRAY_TYPE != Float32Array) {
		out[0] = 0;
		out[1] = 0;
		out[2] = 0;
	}
	return out;
}
/**
* Calculates the length of a vec3
*
* @param {ReadonlyVec3} a vector to calculate length of
* @returns {Number} length of a
*/
function length(a) {
	const x = a[0];
	const y = a[1];
	const z = a[2];
	return Math.sqrt(x * x + y * y + z * z);
}
/**
* Subtracts vector b from vector a
*
* @param {vec3} out the receiving vector
* @param {ReadonlyVec3} a the first operand
* @param {ReadonlyVec3} b the second operand
* @returns {vec3} out
*/
function subtract(out, a, b) {
	out[0] = a[0] - b[0];
	out[1] = a[1] - b[1];
	out[2] = a[2] - b[2];
	return out;
}
/**
* Calculates the euclidian distance between two vec3's
*
* @param {ReadonlyVec3} a the first operand
* @param {ReadonlyVec3} b the second operand
* @returns {Number} distance between a and b
*/
function distance(a, b) {
	const x = b[0] - a[0];
	const y = b[1] - a[1];
	const z = b[2] - a[2];
	return Math.sqrt(x * x + y * y + z * z);
}
/**
* Calculates the squared length of a vec3
*
* @param {ReadonlyVec3} a vector to calculate squared length of
* @returns {Number} squared length of a
*/
function squaredLength(a) {
	const x = a[0];
	const y = a[1];
	const z = a[2];
	return x * x + y * y + z * z;
}
/**
* Negates the components of a vec3
*
* @param {vec3} out the receiving vector
* @param {ReadonlyVec3} a vector to negate
* @returns {vec3} out
*/
function negate(out, a) {
	out[0] = -a[0];
	out[1] = -a[1];
	out[2] = -a[2];
	return out;
}
/**
* Calculates the dot product of two vec3's
*
* @param {ReadonlyVec3} a the first operand
* @param {ReadonlyVec3} b the second operand
* @returns {Number} dot product of a and b
*/
function dot(a, b) {
	return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
/**
* Computes the cross product of two vec3's
*
* @param {vec3} out the receiving vector
* @param {ReadonlyVec3} a the first operand
* @param {ReadonlyVec3} b the second operand
* @returns {vec3} out
*/
function cross(out, a, b) {
	const ax = a[0];
	const ay = a[1];
	const az = a[2];
	const bx = b[0];
	const by = b[1];
	const bz = b[2];
	out[0] = ay * bz - az * by;
	out[1] = az * bx - ax * bz;
	out[2] = ax * by - ay * bx;
	return out;
}
/**
* Performs a linear interpolation between two vec3's
*
* @param {vec3} out the receiving vector
* @param {ReadonlyVec3} a the first operand
* @param {ReadonlyVec3} b the second operand
* @param {Number} t interpolation amount, in the range [0-1], between the two inputs
* @returns {vec3} out
*/
function lerp$1(out, a, b, t) {
	const ax = a[0];
	const ay = a[1];
	const az = a[2];
	out[0] = ax + t * (b[0] - ax);
	out[1] = ay + t * (b[1] - ay);
	out[2] = az + t * (b[2] - az);
	return out;
}
/**
* Transforms the vec3 with a mat4.
* 4th vector component is implicitly '1'
*
* @param {vec3} out the receiving vector
* @param {ReadonlyVec3} a the vector to transform
* @param {ReadonlyMat4} m matrix to transform with
* @returns {vec3} out
*/
function transformMat4$1(out, a, m) {
	const x = a[0];
	const y = a[1];
	const z = a[2];
	let w = m[3] * x + m[7] * y + m[11] * z + m[15];
	w = w || 1;
	out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
	out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
	out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
	return out;
}
/**
* Transforms the vec3 with a mat3.
*
* @param {vec3} out the receiving vector
* @param {ReadonlyVec3} a the vector to transform
* @param {ReadonlyMat3} m the 3x3 matrix to transform with
* @returns {vec3} out
*/
function transformMat3(out, a, m) {
	const x = a[0];
	const y = a[1];
	const z = a[2];
	out[0] = x * m[0] + y * m[3] + z * m[6];
	out[1] = x * m[1] + y * m[4] + z * m[7];
	out[2] = x * m[2] + y * m[5] + z * m[8];
	return out;
}
/**
* Transforms the vec3 with a quat
* Can also be used for dual quaternions. (Multiply it with the real part)
*
* @param {vec3} out the receiving vector
* @param {ReadonlyVec3} a the vector to transform
* @param {ReadonlyQuat} q quaternion to transform with
* @returns {vec3} out
*/
function transformQuat(out, a, q) {
	const qx = q[0];
	const qy = q[1];
	const qz = q[2];
	const qw = q[3];
	const x = a[0];
	const y = a[1];
	const z = a[2];
	let uvx = qy * z - qz * y;
	let uvy = qz * x - qx * z;
	let uvz = qx * y - qy * x;
	let uuvx = qy * uvz - qz * uvy;
	let uuvy = qz * uvx - qx * uvz;
	let uuvz = qx * uvy - qy * uvx;
	const w2 = qw * 2;
	uvx *= w2;
	uvy *= w2;
	uvz *= w2;
	uuvx *= 2;
	uuvy *= 2;
	uuvz *= 2;
	out[0] = x + uvx + uuvx;
	out[1] = y + uvy + uuvy;
	out[2] = z + uvz + uuvz;
	return out;
}
/**
* Rotate a 3D vector around the x-axis
* @param {vec3} out The receiving vec3
* @param {ReadonlyVec3} a The vec3 point to rotate
* @param {ReadonlyVec3} b The origin of the rotation
* @param {Number} rad The angle of rotation in radians
* @returns {vec3} out
*/
function rotateX$1(out, a, b, rad) {
	const p = [];
	const r = [];
	p[0] = a[0] - b[0];
	p[1] = a[1] - b[1];
	p[2] = a[2] - b[2];
	r[0] = p[0];
	r[1] = p[1] * Math.cos(rad) - p[2] * Math.sin(rad);
	r[2] = p[1] * Math.sin(rad) + p[2] * Math.cos(rad);
	out[0] = r[0] + b[0];
	out[1] = r[1] + b[1];
	out[2] = r[2] + b[2];
	return out;
}
/**
* Rotate a 3D vector around the y-axis
* @param {vec3} out The receiving vec3
* @param {ReadonlyVec3} a The vec3 point to rotate
* @param {ReadonlyVec3} b The origin of the rotation
* @param {Number} rad The angle of rotation in radians
* @returns {vec3} out
*/
function rotateY$1(out, a, b, rad) {
	const p = [];
	const r = [];
	p[0] = a[0] - b[0];
	p[1] = a[1] - b[1];
	p[2] = a[2] - b[2];
	r[0] = p[2] * Math.sin(rad) + p[0] * Math.cos(rad);
	r[1] = p[1];
	r[2] = p[2] * Math.cos(rad) - p[0] * Math.sin(rad);
	out[0] = r[0] + b[0];
	out[1] = r[1] + b[1];
	out[2] = r[2] + b[2];
	return out;
}
/**
* Rotate a 3D vector around the z-axis
* @param {vec3} out The receiving vec3
* @param {ReadonlyVec3} a The vec3 point to rotate
* @param {ReadonlyVec3} b The origin of the rotation
* @param {Number} rad The angle of rotation in radians
* @returns {vec3} out
*/
function rotateZ$1(out, a, b, rad) {
	const p = [];
	const r = [];
	p[0] = a[0] - b[0];
	p[1] = a[1] - b[1];
	p[2] = a[2] - b[2];
	r[0] = p[0] * Math.cos(rad) - p[1] * Math.sin(rad);
	r[1] = p[0] * Math.sin(rad) + p[1] * Math.cos(rad);
	r[2] = p[2];
	out[0] = r[0] + b[0];
	out[1] = r[1] + b[1];
	out[2] = r[2] + b[2];
	return out;
}
/**
* Get the angle between two 3D vectors
* @param {ReadonlyVec3} a The first operand
* @param {ReadonlyVec3} b The second operand
* @returns {Number} The angle in radians
*/
function angle(a, b) {
	const ax = a[0];
	const ay = a[1];
	const az = a[2];
	const bx = b[0];
	const by = b[1];
	const bz = b[2];
	const mag = Math.sqrt((ax * ax + ay * ay + az * az) * (bx * bx + by * by + bz * bz));
	const cosine = mag && dot(a, b) / mag;
	return Math.acos(Math.min(Math.max(cosine, -1), 1));
}
/**
* Alias for {@link vec3.subtract}
* @function
*/
var sub = subtract;
/**
* Alias for {@link vec3.distance}
* @function
*/
var dist = distance;
/**
* Alias for {@link vec3.length}
* @function
*/
var len = length;
/**
* Alias for {@link vec3.squaredLength}
* @function
*/
var sqrLen = squaredLength;
(function() {
	const vec = create$1();
	return function(a, stride, offset, count, fn, arg) {
		let i;
		let l;
		if (!stride) stride = 3;
		if (!offset) offset = 0;
		if (count) l = Math.min(count * stride + offset, a.length);
		else l = a.length;
		for (i = offset; i < l; i += stride) {
			vec[0] = a[i];
			vec[1] = a[i + 1];
			vec[2] = a[i + 2];
			fn(vec, vec, arg);
			a[i] = vec[0];
			a[i + 1] = vec[1];
			a[i + 2] = vec[2];
		}
		return a;
	};
})();
//#endregion
//#region node_modules/@math.gl/core/dist/classes/vector3.js
var ORIGIN = [
	0,
	0,
	0
];
var ZERO$1;
/**
* Three-element vector class with common linear algebra operations.
* Subclass of Array<number> meaning that it is highly compatible with other libraries
*/
var Vector3 = class Vector3 extends Vector {
	static get ZERO() {
		if (!ZERO$1) {
			ZERO$1 = new Vector3(0, 0, 0);
			Object.freeze(ZERO$1);
		}
		return ZERO$1;
	}
	/**
	* @class
	* @param x
	* @param y
	* @param z
	*/
	constructor(x = 0, y = 0, z = 0) {
		super(-0, -0, -0);
		if (arguments.length === 1 && isArray(x)) this.copy(x);
		else {
			if (config.debug) {
				checkNumber(x);
				checkNumber(y);
				checkNumber(z);
			}
			this[0] = x;
			this[1] = y;
			this[2] = z;
		}
	}
	set(x, y, z) {
		this[0] = x;
		this[1] = y;
		this[2] = z;
		return this.check();
	}
	copy(array) {
		this[0] = array[0];
		this[1] = array[1];
		this[2] = array[2];
		return this.check();
	}
	fromObject(object) {
		if (config.debug) {
			checkNumber(object.x);
			checkNumber(object.y);
			checkNumber(object.z);
		}
		this[0] = object.x;
		this[1] = object.y;
		this[2] = object.z;
		return this.check();
	}
	toObject(object) {
		object.x = this[0];
		object.y = this[1];
		object.z = this[2];
		return object;
	}
	get ELEMENTS() {
		return 3;
	}
	get z() {
		return this[2];
	}
	set z(value) {
		this[2] = checkNumber(value);
	}
	angle(vector) {
		return angle(this, vector);
	}
	cross(vector) {
		cross(this, this, vector);
		return this.check();
	}
	rotateX({ radians, origin = ORIGIN }) {
		rotateX$1(this, this, origin, radians);
		return this.check();
	}
	rotateY({ radians, origin = ORIGIN }) {
		rotateY$1(this, this, origin, radians);
		return this.check();
	}
	rotateZ({ radians, origin = ORIGIN }) {
		rotateZ$1(this, this, origin, radians);
		return this.check();
	}
	transform(matrix4) {
		return this.transformAsPoint(matrix4);
	}
	transformAsPoint(matrix4) {
		transformMat4$1(this, this, matrix4);
		return this.check();
	}
	transformAsVector(matrix4) {
		vec3_transformMat4AsVector(this, this, matrix4);
		return this.check();
	}
	transformByMatrix3(matrix3) {
		transformMat3(this, this, matrix3);
		return this.check();
	}
	transformByMatrix2(matrix2) {
		vec3_transformMat2(this, this, matrix2);
		return this.check();
	}
	transformByQuaternion(quaternion) {
		transformQuat(this, this, quaternion);
		return this.check();
	}
};
//#endregion
//#region node_modules/@math.gl/core/dist/classes/base/matrix.js
/** Base class for matrices */
var Matrix = class extends MathArray {
	toString() {
		let string = "[";
		if (config.printRowMajor) {
			string += "row-major:";
			for (let row = 0; row < this.RANK; ++row) for (let col = 0; col < this.RANK; ++col) string += ` ${this[col * this.RANK + row]}`;
		} else {
			string += "column-major:";
			for (let i = 0; i < this.ELEMENTS; ++i) string += ` ${this[i]}`;
		}
		string += "]";
		return string;
	}
	getElementIndex(row, col) {
		return col * this.RANK + row;
	}
	getElement(row, col) {
		return this[col * this.RANK + row];
	}
	setElement(row, col, value) {
		this[col * this.RANK + row] = checkNumber(value);
		return this;
	}
	getColumn(columnIndex, result = new Array(this.RANK).fill(-0)) {
		const firstIndex = columnIndex * this.RANK;
		for (let i = 0; i < this.RANK; ++i) result[i] = this[firstIndex + i];
		return result;
	}
	setColumn(columnIndex, columnVector) {
		const firstIndex = columnIndex * this.RANK;
		for (let i = 0; i < this.RANK; ++i) this[firstIndex + i] = columnVector[i];
		return this;
	}
};
//#endregion
//#region node_modules/@math.gl/core/dist/gl-matrix/mat4.js
/**
* Set a mat4 to the identity matrix
*
* @param {mat4} out the receiving matrix
* @returns {mat4} out
*/
function identity(out) {
	out[0] = 1;
	out[1] = 0;
	out[2] = 0;
	out[3] = 0;
	out[4] = 0;
	out[5] = 1;
	out[6] = 0;
	out[7] = 0;
	out[8] = 0;
	out[9] = 0;
	out[10] = 1;
	out[11] = 0;
	out[12] = 0;
	out[13] = 0;
	out[14] = 0;
	out[15] = 1;
	return out;
}
/**
* Transpose the values of a mat4
*
* @param {mat4} out the receiving matrix
* @param {ReadonlyMat4} a the source matrix
* @returns {mat4} out
*/
function transpose(out, a) {
	if (out === a) {
		const a01 = a[1];
		const a02 = a[2];
		const a03 = a[3];
		const a12 = a[6];
		const a13 = a[7];
		const a23 = a[11];
		out[1] = a[4];
		out[2] = a[8];
		out[3] = a[12];
		out[4] = a01;
		out[6] = a[9];
		out[7] = a[13];
		out[8] = a02;
		out[9] = a12;
		out[11] = a[14];
		out[12] = a03;
		out[13] = a13;
		out[14] = a23;
	} else {
		out[0] = a[0];
		out[1] = a[4];
		out[2] = a[8];
		out[3] = a[12];
		out[4] = a[1];
		out[5] = a[5];
		out[6] = a[9];
		out[7] = a[13];
		out[8] = a[2];
		out[9] = a[6];
		out[10] = a[10];
		out[11] = a[14];
		out[12] = a[3];
		out[13] = a[7];
		out[14] = a[11];
		out[15] = a[15];
	}
	return out;
}
/**
* Inverts a mat4
*
* @param {mat4} out the receiving matrix
* @param {ReadonlyMat4} a the source matrix
* @returns {mat4} out
*/
function invert(out, a) {
	const a00 = a[0];
	const a01 = a[1];
	const a02 = a[2];
	const a03 = a[3];
	const a10 = a[4];
	const a11 = a[5];
	const a12 = a[6];
	const a13 = a[7];
	const a20 = a[8];
	const a21 = a[9];
	const a22 = a[10];
	const a23 = a[11];
	const a30 = a[12];
	const a31 = a[13];
	const a32 = a[14];
	const a33 = a[15];
	const b00 = a00 * a11 - a01 * a10;
	const b01 = a00 * a12 - a02 * a10;
	const b02 = a00 * a13 - a03 * a10;
	const b03 = a01 * a12 - a02 * a11;
	const b04 = a01 * a13 - a03 * a11;
	const b05 = a02 * a13 - a03 * a12;
	const b06 = a20 * a31 - a21 * a30;
	const b07 = a20 * a32 - a22 * a30;
	const b08 = a20 * a33 - a23 * a30;
	const b09 = a21 * a32 - a22 * a31;
	const b10 = a21 * a33 - a23 * a31;
	const b11 = a22 * a33 - a23 * a32;
	let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
	if (!det) return null;
	det = 1 / det;
	out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
	out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
	out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
	out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
	out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
	out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
	out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
	out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
	out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
	out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
	out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
	out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
	out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
	out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
	out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
	out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
	return out;
}
/**
* Calculates the determinant of a mat4
*
* @param {ReadonlyMat4} a the source matrix
* @returns {Number} determinant of a
*/
function determinant(a) {
	const a00 = a[0];
	const a01 = a[1];
	const a02 = a[2];
	const a03 = a[3];
	const a10 = a[4];
	const a11 = a[5];
	const a12 = a[6];
	const a13 = a[7];
	const a20 = a[8];
	const a21 = a[9];
	const a22 = a[10];
	const a23 = a[11];
	const a30 = a[12];
	const a31 = a[13];
	const a32 = a[14];
	const a33 = a[15];
	const b0 = a00 * a11 - a01 * a10;
	const b1 = a00 * a12 - a02 * a10;
	const b2 = a01 * a12 - a02 * a11;
	const b3 = a20 * a31 - a21 * a30;
	const b4 = a20 * a32 - a22 * a30;
	const b5 = a21 * a32 - a22 * a31;
	const b6 = a00 * b5 - a01 * b4 + a02 * b3;
	const b7 = a10 * b5 - a11 * b4 + a12 * b3;
	const b8 = a20 * b2 - a21 * b1 + a22 * b0;
	const b9 = a30 * b2 - a31 * b1 + a32 * b0;
	return a13 * b6 - a03 * b7 + a33 * b8 - a23 * b9;
}
/**
* Multiplies two mat4s
*
* @param {mat4} out the receiving matrix
* @param {ReadonlyMat4} a the first operand
* @param {ReadonlyMat4} b the second operand
* @returns {mat4} out
*/
function multiply(out, a, b) {
	const a00 = a[0];
	const a01 = a[1];
	const a02 = a[2];
	const a03 = a[3];
	const a10 = a[4];
	const a11 = a[5];
	const a12 = a[6];
	const a13 = a[7];
	const a20 = a[8];
	const a21 = a[9];
	const a22 = a[10];
	const a23 = a[11];
	const a30 = a[12];
	const a31 = a[13];
	const a32 = a[14];
	const a33 = a[15];
	let b0 = b[0];
	let b1 = b[1];
	let b2 = b[2];
	let b3 = b[3];
	out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
	out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
	out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
	out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
	b0 = b[4];
	b1 = b[5];
	b2 = b[6];
	b3 = b[7];
	out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
	out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
	out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
	out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
	b0 = b[8];
	b1 = b[9];
	b2 = b[10];
	b3 = b[11];
	out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
	out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
	out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
	out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
	b0 = b[12];
	b1 = b[13];
	b2 = b[14];
	b3 = b[15];
	out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
	out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
	out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
	out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
	return out;
}
/**
* Translate a mat4 by the given vector
*
* @param {mat4} out the receiving matrix
* @param {ReadonlyMat4} a the matrix to translate
* @param {ReadonlyVec3} v vector to translate by
* @returns {mat4} out
*/
function translate(out, a, v) {
	const x = v[0];
	const y = v[1];
	const z = v[2];
	let a00;
	let a01;
	let a02;
	let a03;
	let a10;
	let a11;
	let a12;
	let a13;
	let a20;
	let a21;
	let a22;
	let a23;
	if (a === out) {
		out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
		out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
		out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
		out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
	} else {
		a00 = a[0];
		a01 = a[1];
		a02 = a[2];
		a03 = a[3];
		a10 = a[4];
		a11 = a[5];
		a12 = a[6];
		a13 = a[7];
		a20 = a[8];
		a21 = a[9];
		a22 = a[10];
		a23 = a[11];
		out[0] = a00;
		out[1] = a01;
		out[2] = a02;
		out[3] = a03;
		out[4] = a10;
		out[5] = a11;
		out[6] = a12;
		out[7] = a13;
		out[8] = a20;
		out[9] = a21;
		out[10] = a22;
		out[11] = a23;
		out[12] = a00 * x + a10 * y + a20 * z + a[12];
		out[13] = a01 * x + a11 * y + a21 * z + a[13];
		out[14] = a02 * x + a12 * y + a22 * z + a[14];
		out[15] = a03 * x + a13 * y + a23 * z + a[15];
	}
	return out;
}
/**
* Scales the mat4 by the dimensions in the given vec3 not using vectorization
*
* @param {mat4} out the receiving matrix
* @param {ReadonlyMat4} a the matrix to scale
* @param {ReadonlyVec3} v the vec3 to scale the matrix by
* @returns {mat4} out
**/
function scale$1(out, a, v) {
	const x = v[0];
	const y = v[1];
	const z = v[2];
	out[0] = a[0] * x;
	out[1] = a[1] * x;
	out[2] = a[2] * x;
	out[3] = a[3] * x;
	out[4] = a[4] * y;
	out[5] = a[5] * y;
	out[6] = a[6] * y;
	out[7] = a[7] * y;
	out[8] = a[8] * z;
	out[9] = a[9] * z;
	out[10] = a[10] * z;
	out[11] = a[11] * z;
	out[12] = a[12];
	out[13] = a[13];
	out[14] = a[14];
	out[15] = a[15];
	return out;
}
/**
* Rotates a mat4 by the given angle around the given axis
*
* @param {mat4} out the receiving matrix
* @param {ReadonlyMat4} a the matrix to rotate
* @param {Number} rad the angle to rotate the matrix by
* @param {ReadonlyVec3} axis the axis to rotate around
* @returns {mat4} out
*/
function rotate(out, a, rad, axis) {
	let x = axis[0];
	let y = axis[1];
	let z = axis[2];
	let len = Math.sqrt(x * x + y * y + z * z);
	let c;
	let s;
	let t;
	let a00;
	let a01;
	let a02;
	let a03;
	let a10;
	let a11;
	let a12;
	let a13;
	let a20;
	let a21;
	let a22;
	let a23;
	let b00;
	let b01;
	let b02;
	let b10;
	let b11;
	let b12;
	let b20;
	let b21;
	let b22;
	if (len < 1e-6) return null;
	len = 1 / len;
	x *= len;
	y *= len;
	z *= len;
	s = Math.sin(rad);
	c = Math.cos(rad);
	t = 1 - c;
	a00 = a[0];
	a01 = a[1];
	a02 = a[2];
	a03 = a[3];
	a10 = a[4];
	a11 = a[5];
	a12 = a[6];
	a13 = a[7];
	a20 = a[8];
	a21 = a[9];
	a22 = a[10];
	a23 = a[11];
	b00 = x * x * t + c;
	b01 = y * x * t + z * s;
	b02 = z * x * t - y * s;
	b10 = x * y * t - z * s;
	b11 = y * y * t + c;
	b12 = z * y * t + x * s;
	b20 = x * z * t + y * s;
	b21 = y * z * t - x * s;
	b22 = z * z * t + c;
	out[0] = a00 * b00 + a10 * b01 + a20 * b02;
	out[1] = a01 * b00 + a11 * b01 + a21 * b02;
	out[2] = a02 * b00 + a12 * b01 + a22 * b02;
	out[3] = a03 * b00 + a13 * b01 + a23 * b02;
	out[4] = a00 * b10 + a10 * b11 + a20 * b12;
	out[5] = a01 * b10 + a11 * b11 + a21 * b12;
	out[6] = a02 * b10 + a12 * b11 + a22 * b12;
	out[7] = a03 * b10 + a13 * b11 + a23 * b12;
	out[8] = a00 * b20 + a10 * b21 + a20 * b22;
	out[9] = a01 * b20 + a11 * b21 + a21 * b22;
	out[10] = a02 * b20 + a12 * b21 + a22 * b22;
	out[11] = a03 * b20 + a13 * b21 + a23 * b22;
	if (a !== out) {
		out[12] = a[12];
		out[13] = a[13];
		out[14] = a[14];
		out[15] = a[15];
	}
	return out;
}
/**
* Rotates a matrix by the given angle around the X axis
*
* @param {mat4} out the receiving matrix
* @param {ReadonlyMat4} a the matrix to rotate
* @param {Number} rad the angle to rotate the matrix by
* @returns {mat4} out
*/
function rotateX(out, a, rad) {
	const s = Math.sin(rad);
	const c = Math.cos(rad);
	const a10 = a[4];
	const a11 = a[5];
	const a12 = a[6];
	const a13 = a[7];
	const a20 = a[8];
	const a21 = a[9];
	const a22 = a[10];
	const a23 = a[11];
	if (a !== out) {
		out[0] = a[0];
		out[1] = a[1];
		out[2] = a[2];
		out[3] = a[3];
		out[12] = a[12];
		out[13] = a[13];
		out[14] = a[14];
		out[15] = a[15];
	}
	out[4] = a10 * c + a20 * s;
	out[5] = a11 * c + a21 * s;
	out[6] = a12 * c + a22 * s;
	out[7] = a13 * c + a23 * s;
	out[8] = a20 * c - a10 * s;
	out[9] = a21 * c - a11 * s;
	out[10] = a22 * c - a12 * s;
	out[11] = a23 * c - a13 * s;
	return out;
}
/**
* Rotates a matrix by the given angle around the Y axis
*
* @param {mat4} out the receiving matrix
* @param {ReadonlyMat4} a the matrix to rotate
* @param {Number} rad the angle to rotate the matrix by
* @returns {mat4} out
*/
function rotateY(out, a, rad) {
	const s = Math.sin(rad);
	const c = Math.cos(rad);
	const a00 = a[0];
	const a01 = a[1];
	const a02 = a[2];
	const a03 = a[3];
	const a20 = a[8];
	const a21 = a[9];
	const a22 = a[10];
	const a23 = a[11];
	if (a !== out) {
		out[4] = a[4];
		out[5] = a[5];
		out[6] = a[6];
		out[7] = a[7];
		out[12] = a[12];
		out[13] = a[13];
		out[14] = a[14];
		out[15] = a[15];
	}
	out[0] = a00 * c - a20 * s;
	out[1] = a01 * c - a21 * s;
	out[2] = a02 * c - a22 * s;
	out[3] = a03 * c - a23 * s;
	out[8] = a00 * s + a20 * c;
	out[9] = a01 * s + a21 * c;
	out[10] = a02 * s + a22 * c;
	out[11] = a03 * s + a23 * c;
	return out;
}
/**
* Rotates a matrix by the given angle around the Z axis
*
* @param {mat4} out the receiving matrix
* @param {ReadonlyMat4} a the matrix to rotate
* @param {Number} rad the angle to rotate the matrix by
* @returns {mat4} out
*/
function rotateZ(out, a, rad) {
	const s = Math.sin(rad);
	const c = Math.cos(rad);
	const a00 = a[0];
	const a01 = a[1];
	const a02 = a[2];
	const a03 = a[3];
	const a10 = a[4];
	const a11 = a[5];
	const a12 = a[6];
	const a13 = a[7];
	if (a !== out) {
		out[8] = a[8];
		out[9] = a[9];
		out[10] = a[10];
		out[11] = a[11];
		out[12] = a[12];
		out[13] = a[13];
		out[14] = a[14];
		out[15] = a[15];
	}
	out[0] = a00 * c + a10 * s;
	out[1] = a01 * c + a11 * s;
	out[2] = a02 * c + a12 * s;
	out[3] = a03 * c + a13 * s;
	out[4] = a10 * c - a00 * s;
	out[5] = a11 * c - a01 * s;
	out[6] = a12 * c - a02 * s;
	out[7] = a13 * c - a03 * s;
	return out;
}
/**
* Calculates a 4x4 matrix from the given quaternion
*
* @param {mat4} out mat4 receiving operation result
* @param {ReadonlyQuat} q Quaternion to create matrix from
*
* @returns {mat4} out
*/
function fromQuat(out, q) {
	const x = q[0];
	const y = q[1];
	const z = q[2];
	const w = q[3];
	const x2 = x + x;
	const y2 = y + y;
	const z2 = z + z;
	const xx = x * x2;
	const yx = y * x2;
	const yy = y * y2;
	const zx = z * x2;
	const zy = z * y2;
	const zz = z * z2;
	const wx = w * x2;
	const wy = w * y2;
	const wz = w * z2;
	out[0] = 1 - yy - zz;
	out[1] = yx + wz;
	out[2] = zx - wy;
	out[3] = 0;
	out[4] = yx - wz;
	out[5] = 1 - xx - zz;
	out[6] = zy + wx;
	out[7] = 0;
	out[8] = zx + wy;
	out[9] = zy - wx;
	out[10] = 1 - xx - yy;
	out[11] = 0;
	out[12] = 0;
	out[13] = 0;
	out[14] = 0;
	out[15] = 1;
	return out;
}
/**
* Generates a frustum matrix with the given bounds
*
* @param {mat4} out mat4 frustum matrix will be written into
* @param {Number} left Left bound of the frustum
* @param {Number} right Right bound of the frustum
* @param {Number} bottom Bottom bound of the frustum
* @param {Number} top Top bound of the frustum
* @param {Number} near Near bound of the frustum
* @param {Number} far Far bound of the frustum
* @returns {mat4} out
*/
function frustum(out, left, right, bottom, top, near, far) {
	const rl = 1 / (right - left);
	const tb = 1 / (top - bottom);
	const nf = 1 / (near - far);
	out[0] = near * 2 * rl;
	out[1] = 0;
	out[2] = 0;
	out[3] = 0;
	out[4] = 0;
	out[5] = near * 2 * tb;
	out[6] = 0;
	out[7] = 0;
	out[8] = (right + left) * rl;
	out[9] = (top + bottom) * tb;
	out[10] = (far + near) * nf;
	out[11] = -1;
	out[12] = 0;
	out[13] = 0;
	out[14] = far * near * 2 * nf;
	out[15] = 0;
	return out;
}
/**
* Generates a perspective projection matrix with the given bounds.
* The near/far clip planes correspond to a normalized device coordinate Z range of [-1, 1],
* which matches WebGL/OpenGL's clip volume.
* Passing null/undefined/no value for far will generate infinite projection matrix.
*
* @param {mat4} out mat4 frustum matrix will be written into
* @param {number} fovy Vertical field of view in radians
* @param {number} aspect Aspect ratio. typically viewport width/height
* @param {number} near Near bound of the frustum
* @param {number} far Far bound of the frustum, can be null or Infinity
* @returns {mat4} out
*/
function perspectiveNO(out, fovy, aspect, near, far) {
	const f = 1 / Math.tan(fovy / 2);
	out[0] = f / aspect;
	out[1] = 0;
	out[2] = 0;
	out[3] = 0;
	out[4] = 0;
	out[5] = f;
	out[6] = 0;
	out[7] = 0;
	out[8] = 0;
	out[9] = 0;
	out[11] = -1;
	out[12] = 0;
	out[13] = 0;
	out[15] = 0;
	if (far != null && far !== Infinity) {
		const nf = 1 / (near - far);
		out[10] = (far + near) * nf;
		out[14] = 2 * far * near * nf;
	} else {
		out[10] = -1;
		out[14] = -2 * near;
	}
	return out;
}
/**
* Alias for {@link mat4.perspectiveNO}
* @function
*/
var perspective = perspectiveNO;
/**
* Generates a orthogonal projection matrix with the given bounds.
* The near/far clip planes correspond to a normalized device coordinate Z range of [-1, 1],
* which matches WebGL/OpenGL's clip volume.
*
* @param {mat4} out mat4 frustum matrix will be written into
* @param {number} left Left bound of the frustum
* @param {number} right Right bound of the frustum
* @param {number} bottom Bottom bound of the frustum
* @param {number} top Top bound of the frustum
* @param {number} near Near bound of the frustum
* @param {number} far Far bound of the frustum
* @returns {mat4} out
*/
function orthoNO(out, left, right, bottom, top, near, far) {
	const lr = 1 / (left - right);
	const bt = 1 / (bottom - top);
	const nf = 1 / (near - far);
	out[0] = -2 * lr;
	out[1] = 0;
	out[2] = 0;
	out[3] = 0;
	out[4] = 0;
	out[5] = -2 * bt;
	out[6] = 0;
	out[7] = 0;
	out[8] = 0;
	out[9] = 0;
	out[10] = 2 * nf;
	out[11] = 0;
	out[12] = (left + right) * lr;
	out[13] = (top + bottom) * bt;
	out[14] = (far + near) * nf;
	out[15] = 1;
	return out;
}
/**
* Alias for {@link mat4.orthoNO}
* @function
*/
var ortho = orthoNO;
/**
* Generates a look-at matrix with the given eye position, focal point, and up axis.
* If you want a matrix that actually makes an object look at another object, you should use targetTo instead.
*
* @param {mat4} out mat4 frustum matrix will be written into
* @param {ReadonlyVec3} eye Position of the viewer
* @param {ReadonlyVec3} center Point the viewer is looking at
* @param {ReadonlyVec3} up vec3 pointing up
* @returns {mat4} out
*/
function lookAt(out, eye, center, up) {
	let len;
	let x0;
	let x1;
	let x2;
	let y0;
	let y1;
	let y2;
	let z0;
	let z1;
	let z2;
	const eyex = eye[0];
	const eyey = eye[1];
	const eyez = eye[2];
	const upx = up[0];
	const upy = up[1];
	const upz = up[2];
	const centerx = center[0];
	const centery = center[1];
	const centerz = center[2];
	if (Math.abs(eyex - centerx) < 1e-6 && Math.abs(eyey - centery) < 1e-6 && Math.abs(eyez - centerz) < 1e-6) return identity(out);
	z0 = eyex - centerx;
	z1 = eyey - centery;
	z2 = eyez - centerz;
	len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
	z0 *= len;
	z1 *= len;
	z2 *= len;
	x0 = upy * z2 - upz * z1;
	x1 = upz * z0 - upx * z2;
	x2 = upx * z1 - upy * z0;
	len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
	if (!len) {
		x0 = 0;
		x1 = 0;
		x2 = 0;
	} else {
		len = 1 / len;
		x0 *= len;
		x1 *= len;
		x2 *= len;
	}
	y0 = z1 * x2 - z2 * x1;
	y1 = z2 * x0 - z0 * x2;
	y2 = z0 * x1 - z1 * x0;
	len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
	if (!len) {
		y0 = 0;
		y1 = 0;
		y2 = 0;
	} else {
		len = 1 / len;
		y0 *= len;
		y1 *= len;
		y2 *= len;
	}
	out[0] = x0;
	out[1] = y0;
	out[2] = z0;
	out[3] = 0;
	out[4] = x1;
	out[5] = y1;
	out[6] = z1;
	out[7] = 0;
	out[8] = x2;
	out[9] = y2;
	out[10] = z2;
	out[11] = 0;
	out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
	out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
	out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
	out[15] = 1;
	return out;
}
//#endregion
//#region node_modules/@math.gl/core/dist/gl-matrix/vec4.js
/**
* 4 Dimensional Vector
* @module vec4
*/
/**
* Creates a new, empty vec4
*
* @returns {vec4} a new 4D vector
*/
function create() {
	const out = new ARRAY_TYPE(4);
	if (ARRAY_TYPE != Float32Array) {
		out[0] = 0;
		out[1] = 0;
		out[2] = 0;
		out[3] = 0;
	}
	return out;
}
/**
* Scales a vec4 by a scalar number
*
* @param {vec4} out the receiving vector
* @param {ReadonlyVec4} a the vector to scale
* @param {Number} b amount to scale the vector by
* @returns {vec4} out
*/
function scale(out, a, b) {
	out[0] = a[0] * b;
	out[1] = a[1] * b;
	out[2] = a[2] * b;
	out[3] = a[3] * b;
	return out;
}
/**
* Transforms the vec4 with a mat4.
*
* @param {vec4} out the receiving vector
* @param {ReadonlyVec4} a the vector to transform
* @param {ReadonlyMat4} m matrix to transform with
* @returns {vec4} out
*/
function transformMat4(out, a, m) {
	const x = a[0];
	const y = a[1];
	const z = a[2];
	const w = a[3];
	out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
	out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
	out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
	out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
	return out;
}
(function() {
	const vec = create();
	return function(a, stride, offset, count, fn, arg) {
		let i;
		let l;
		if (!stride) stride = 4;
		if (!offset) offset = 0;
		if (count) l = Math.min(count * stride + offset, a.length);
		else l = a.length;
		for (i = offset; i < l; i += stride) {
			vec[0] = a[i];
			vec[1] = a[i + 1];
			vec[2] = a[i + 2];
			vec[3] = a[i + 3];
			fn(vec, vec, arg);
			a[i] = vec[0];
			a[i + 1] = vec[1];
			a[i + 2] = vec[2];
			a[i + 3] = vec[3];
		}
		return a;
	};
})();
//#endregion
//#region node_modules/@math.gl/core/dist/classes/matrix4.js
var INDICES;
(function(INDICES) {
	INDICES[INDICES["COL0ROW0"] = 0] = "COL0ROW0";
	INDICES[INDICES["COL0ROW1"] = 1] = "COL0ROW1";
	INDICES[INDICES["COL0ROW2"] = 2] = "COL0ROW2";
	INDICES[INDICES["COL0ROW3"] = 3] = "COL0ROW3";
	INDICES[INDICES["COL1ROW0"] = 4] = "COL1ROW0";
	INDICES[INDICES["COL1ROW1"] = 5] = "COL1ROW1";
	INDICES[INDICES["COL1ROW2"] = 6] = "COL1ROW2";
	INDICES[INDICES["COL1ROW3"] = 7] = "COL1ROW3";
	INDICES[INDICES["COL2ROW0"] = 8] = "COL2ROW0";
	INDICES[INDICES["COL2ROW1"] = 9] = "COL2ROW1";
	INDICES[INDICES["COL2ROW2"] = 10] = "COL2ROW2";
	INDICES[INDICES["COL2ROW3"] = 11] = "COL2ROW3";
	INDICES[INDICES["COL3ROW0"] = 12] = "COL3ROW0";
	INDICES[INDICES["COL3ROW1"] = 13] = "COL3ROW1";
	INDICES[INDICES["COL3ROW2"] = 14] = "COL3ROW2";
	INDICES[INDICES["COL3ROW3"] = 15] = "COL3ROW3";
})(INDICES || (INDICES = {}));
var DEFAULT_FOVY = 45 * Math.PI / 180;
var DEFAULT_ASPECT = 1;
var DEFAULT_NEAR = .1;
var DEFAULT_FAR = 500;
var IDENTITY_MATRIX$1 = Object.freeze([
	1,
	0,
	0,
	0,
	0,
	1,
	0,
	0,
	0,
	0,
	1,
	0,
	0,
	0,
	0,
	1
]);
/**
* A 4x4 matrix with common linear algebra operations
* Subclass of Array<number> meaning that it is highly compatible with other libraries
*/
var Matrix4 = class extends Matrix {
	static get IDENTITY() {
		return getIdentityMatrix();
	}
	static get ZERO() {
		return getZeroMatrix();
	}
	get ELEMENTS() {
		return 16;
	}
	get RANK() {
		return 4;
	}
	get INDICES() {
		return INDICES;
	}
	constructor(array) {
		super(-0, -0, -0, -0, -0, -0, -0, -0, -0, -0, -0, -0, -0, -0, -0, -0);
		if (arguments.length === 1 && Array.isArray(array)) this.copy(array);
		else this.identity();
	}
	copy(array) {
		this[0] = array[0];
		this[1] = array[1];
		this[2] = array[2];
		this[3] = array[3];
		this[4] = array[4];
		this[5] = array[5];
		this[6] = array[6];
		this[7] = array[7];
		this[8] = array[8];
		this[9] = array[9];
		this[10] = array[10];
		this[11] = array[11];
		this[12] = array[12];
		this[13] = array[13];
		this[14] = array[14];
		this[15] = array[15];
		return this.check();
	}
	set(m00, m10, m20, m30, m01, m11, m21, m31, m02, m12, m22, m32, m03, m13, m23, m33) {
		this[0] = m00;
		this[1] = m10;
		this[2] = m20;
		this[3] = m30;
		this[4] = m01;
		this[5] = m11;
		this[6] = m21;
		this[7] = m31;
		this[8] = m02;
		this[9] = m12;
		this[10] = m22;
		this[11] = m32;
		this[12] = m03;
		this[13] = m13;
		this[14] = m23;
		this[15] = m33;
		return this.check();
	}
	setRowMajor(m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
		this[0] = m00;
		this[1] = m10;
		this[2] = m20;
		this[3] = m30;
		this[4] = m01;
		this[5] = m11;
		this[6] = m21;
		this[7] = m31;
		this[8] = m02;
		this[9] = m12;
		this[10] = m22;
		this[11] = m32;
		this[12] = m03;
		this[13] = m13;
		this[14] = m23;
		this[15] = m33;
		return this.check();
	}
	toRowMajor(result) {
		result[0] = this[0];
		result[1] = this[4];
		result[2] = this[8];
		result[3] = this[12];
		result[4] = this[1];
		result[5] = this[5];
		result[6] = this[9];
		result[7] = this[13];
		result[8] = this[2];
		result[9] = this[6];
		result[10] = this[10];
		result[11] = this[14];
		result[12] = this[3];
		result[13] = this[7];
		result[14] = this[11];
		result[15] = this[15];
		return result;
	}
	/** Set to identity matrix */
	identity() {
		return this.copy(IDENTITY_MATRIX$1);
	}
	/**
	*
	* @param object
	* @returns self
	*/
	fromObject(object) {
		return this.check();
	}
	/**
	* Calculates a 4x4 matrix from the given quaternion
	* @param quaternion Quaternion to create matrix from
	* @returns self
	*/
	fromQuaternion(quaternion) {
		fromQuat(this, quaternion);
		return this.check();
	}
	/**
	* Generates a frustum matrix with the given bounds
	* @param view.left - Left bound of the frustum
	* @param view.right - Right bound of the frustum
	* @param view.bottom - Bottom bound of the frustum
	* @param view.top - Top bound of the frustum
	* @param view.near - Near bound of the frustum
	* @param view.far - Far bound of the frustum. Can be set to Infinity.
	* @returns self
	*/
	frustum(view) {
		const { left, right, bottom, top, near = DEFAULT_NEAR, far = DEFAULT_FAR } = view;
		if (far === Infinity) computeInfinitePerspectiveOffCenter(this, left, right, bottom, top, near);
		else frustum(this, left, right, bottom, top, near, far);
		return this.check();
	}
	/**
	* Generates a look-at matrix with the given eye position, focal point,
	* and up axis
	* @param view.eye - (vector) Position of the viewer
	* @param view.center - (vector) Point the viewer is looking at
	* @param view.up - (vector) Up axis
	* @returns self
	*/
	lookAt(view) {
		const { eye, center = [
			0,
			0,
			0
		], up = [
			0,
			1,
			0
		] } = view;
		lookAt(this, eye, center, up);
		return this.check();
	}
	/**
	* Generates a orthogonal projection matrix with the given bounds
	* from "traditional" view space parameters
	* @param view.left - Left bound of the frustum
	* @param view.right number  Right bound of the frustum
	* @param view.bottom - Bottom bound of the frustum
	* @param view.top number  Top bound of the frustum
	* @param view.near - Near bound of the frustum
	* @param view.far number  Far bound of the frustum
	* @returns self
	*/
	ortho(view) {
		const { left, right, bottom, top, near = DEFAULT_NEAR, far = DEFAULT_FAR } = view;
		ortho(this, left, right, bottom, top, near, far);
		return this.check();
	}
	/**
	* Generates an orthogonal projection matrix with the same parameters
	* as a perspective matrix (plus focalDistance)
	* @param view.fovy Vertical field of view in radians
	* @param view.aspect Aspect ratio. Typically viewport width / viewport height
	* @param view.focalDistance Distance in the view frustum used for extent calculations
	* @param view.near Near bound of the frustum
	* @param view.far Far bound of the frustum
	* @returns self
	*/
	orthographic(view) {
		const { fovy = DEFAULT_FOVY, aspect = DEFAULT_ASPECT, focalDistance = 1, near = DEFAULT_NEAR, far = DEFAULT_FAR } = view;
		checkRadians(fovy);
		const halfY = fovy / 2;
		const top = focalDistance * Math.tan(halfY);
		const right = top * aspect;
		return this.ortho({
			left: -right,
			right,
			bottom: -top,
			top,
			near,
			far
		});
	}
	/**
	* Generates a perspective projection matrix with the given bounds
	* @param view.fovy Vertical field of view in radians
	* @param view.aspect Aspect ratio. typically viewport width/height
	* @param view.near Near bound of the frustum
	* @param view.far Far bound of the frustum
	* @returns self
	*/
	perspective(view) {
		const { fovy = 45 * Math.PI / 180, aspect = 1, near = .1, far = 500 } = view;
		checkRadians(fovy);
		perspective(this, fovy, aspect, near, far);
		return this.check();
	}
	determinant() {
		return determinant(this);
	}
	/**
	* Extracts the non-uniform scale assuming the matrix is an affine transformation.
	* The scales are the "lengths" of the column vectors in the upper-left 3x3 matrix.
	* @param result
	* @returns self
	*/
	getScale(result = [
		-0,
		-0,
		-0
	]) {
		result[0] = Math.sqrt(this[0] * this[0] + this[1] * this[1] + this[2] * this[2]);
		result[1] = Math.sqrt(this[4] * this[4] + this[5] * this[5] + this[6] * this[6]);
		result[2] = Math.sqrt(this[8] * this[8] + this[9] * this[9] + this[10] * this[10]);
		return result;
	}
	/**
	* Gets the translation portion, assuming the matrix is a affine transformation matrix.
	* @param result
	* @returns self
	*/
	getTranslation(result = [
		-0,
		-0,
		-0
	]) {
		result[0] = this[12];
		result[1] = this[13];
		result[2] = this[14];
		return result;
	}
	/**
	* Gets upper left 3x3 pure rotation matrix (non-scaling), assume affine transformation matrix
	* @param result
	* @param scaleResult
	* @returns self
	*/
	getRotation(result, scaleResult) {
		result = result || [
			-0,
			-0,
			-0,
			-0,
			-0,
			-0,
			-0,
			-0,
			-0,
			-0,
			-0,
			-0,
			-0,
			-0,
			-0,
			-0
		];
		scaleResult = scaleResult || [
			-0,
			-0,
			-0
		];
		const scale = this.getScale(scaleResult);
		const inverseScale0 = 1 / scale[0];
		const inverseScale1 = 1 / scale[1];
		const inverseScale2 = 1 / scale[2];
		result[0] = this[0] * inverseScale0;
		result[1] = this[1] * inverseScale1;
		result[2] = this[2] * inverseScale2;
		result[3] = 0;
		result[4] = this[4] * inverseScale0;
		result[5] = this[5] * inverseScale1;
		result[6] = this[6] * inverseScale2;
		result[7] = 0;
		result[8] = this[8] * inverseScale0;
		result[9] = this[9] * inverseScale1;
		result[10] = this[10] * inverseScale2;
		result[11] = 0;
		result[12] = 0;
		result[13] = 0;
		result[14] = 0;
		result[15] = 1;
		return result;
	}
	/**
	*
	* @param result
	* @param scaleResult
	* @returns self
	*/
	getRotationMatrix3(result, scaleResult) {
		result = result || [
			-0,
			-0,
			-0,
			-0,
			-0,
			-0,
			-0,
			-0,
			-0
		];
		scaleResult = scaleResult || [
			-0,
			-0,
			-0
		];
		const scale = this.getScale(scaleResult);
		const inverseScale0 = 1 / scale[0];
		const inverseScale1 = 1 / scale[1];
		const inverseScale2 = 1 / scale[2];
		result[0] = this[0] * inverseScale0;
		result[1] = this[1] * inverseScale1;
		result[2] = this[2] * inverseScale2;
		result[3] = this[4] * inverseScale0;
		result[4] = this[5] * inverseScale1;
		result[5] = this[6] * inverseScale2;
		result[6] = this[8] * inverseScale0;
		result[7] = this[9] * inverseScale1;
		result[8] = this[10] * inverseScale2;
		return result;
	}
	transpose() {
		transpose(this, this);
		return this.check();
	}
	invert() {
		invert(this, this);
		return this.check();
	}
	multiplyLeft(a) {
		multiply(this, a, this);
		return this.check();
	}
	multiplyRight(a) {
		multiply(this, this, a);
		return this.check();
	}
	rotateX(radians) {
		rotateX(this, this, radians);
		return this.check();
	}
	rotateY(radians) {
		rotateY(this, this, radians);
		return this.check();
	}
	/**
	* Rotates a matrix by the given angle around the Z axis.
	* @param radians
	* @returns self
	*/
	rotateZ(radians) {
		rotateZ(this, this, radians);
		return this.check();
	}
	/**
	*
	* @param param0
	* @returns self
	*/
	rotateXYZ(angleXYZ) {
		return this.rotateX(angleXYZ[0]).rotateY(angleXYZ[1]).rotateZ(angleXYZ[2]);
	}
	/**
	*
	* @param radians
	* @param axis
	* @returns self
	*/
	rotateAxis(radians, axis) {
		rotate(this, this, radians, axis);
		return this.check();
	}
	/**
	*
	* @param factor
	* @returns self
	*/
	scale(factor) {
		scale$1(this, this, Array.isArray(factor) ? factor : [
			factor,
			factor,
			factor
		]);
		return this.check();
	}
	/**
	*
	* @param vec
	* @returns self
	*/
	translate(vector) {
		translate(this, this, vector);
		return this.check();
	}
	/**
	* Transforms any 2, 3 or 4 element vector. 2 and 3 elements are treated as points
	* @param vector
	* @param result
	* @returns self
	*/
	transform(vector, result) {
		if (vector.length === 4) {
			result = transformMat4(result || [
				-0,
				-0,
				-0,
				-0
			], vector, this);
			checkVector(result, 4);
			return result;
		}
		return this.transformAsPoint(vector, result);
	}
	/**
	* Transforms any 2 or 3 element array as point (w implicitly 1)
	* @param vector
	* @param result
	* @returns self
	*/
	transformAsPoint(vector, result) {
		const { length } = vector;
		let out;
		switch (length) {
			case 2:
				out = transformMat4$2(result || [-0, -0], vector, this);
				break;
			case 3:
				out = transformMat4$1(result || [
					-0,
					-0,
					-0
				], vector, this);
				break;
			default: throw new Error("Illegal vector");
		}
		checkVector(out, vector.length);
		return out;
	}
	/**
	* Transforms any 2 or 3 element array as vector (w implicitly 0)
	* @param vector
	* @param result
	* @returns self
	*/
	transformAsVector(vector, result) {
		let out;
		switch (vector.length) {
			case 2:
				out = vec2_transformMat4AsVector(result || [-0, -0], vector, this);
				break;
			case 3:
				out = vec3_transformMat4AsVector(result || [
					-0,
					-0,
					-0
				], vector, this);
				break;
			default: throw new Error("Illegal vector");
		}
		checkVector(out, vector.length);
		return out;
	}
	/** @deprecated */
	transformPoint(vector, result) {
		return this.transformAsPoint(vector, result);
	}
	/** @deprecated */
	transformVector(vector, result) {
		return this.transformAsPoint(vector, result);
	}
	/** @deprecated */
	transformDirection(vector, result) {
		return this.transformAsVector(vector, result);
	}
	makeRotationX(radians) {
		return this.identity().rotateX(radians);
	}
	makeTranslation(x, y, z) {
		return this.identity().translate([
			x,
			y,
			z
		]);
	}
};
var ZERO;
var IDENTITY$1;
function getZeroMatrix() {
	if (!ZERO) {
		ZERO = new Matrix4([
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0
		]);
		Object.freeze(ZERO);
	}
	return ZERO;
}
function getIdentityMatrix() {
	if (!IDENTITY$1) {
		IDENTITY$1 = new Matrix4();
		Object.freeze(IDENTITY$1);
	}
	return IDENTITY$1;
}
function checkRadians(possiblyDegrees) {
	if (possiblyDegrees > Math.PI * 2) throw Error("expected radians");
}
function computeInfinitePerspectiveOffCenter(result, left, right, bottom, top, near) {
	const column0Row0 = 2 * near / (right - left);
	const column1Row1 = 2 * near / (top - bottom);
	const column2Row0 = (right + left) / (right - left);
	const column2Row1 = (top + bottom) / (top - bottom);
	const column2Row2 = -1;
	const column2Row3 = -1;
	const column3Row2 = -2 * near;
	result[0] = column0Row0;
	result[1] = 0;
	result[2] = 0;
	result[3] = 0;
	result[4] = 0;
	result[5] = column1Row1;
	result[6] = 0;
	result[7] = 0;
	result[8] = column2Row0;
	result[9] = column2Row1;
	result[10] = column2Row2;
	result[11] = column2Row3;
	result[12] = 0;
	result[13] = 0;
	result[14] = column3Row2;
	result[15] = 0;
	return result;
}
//#endregion
//#region node_modules/@luma.gl/shadertools/dist/modules/math/fp64/fp64-utils.js
/**
* Calculate WebGL 64 bit float
* @param a  - the input float number
* @param out - the output array. If not supplied, a new array is created.
* @param startIndex - the index in the output array to fill from. Default 0.
* @returns - the fp64 representation of the input number
*/
function fp64ify(a, out = [], startIndex = 0) {
	const hiPart = Math.fround(a);
	const loPart = a - hiPart;
	out[startIndex] = hiPart;
	out[startIndex + 1] = loPart;
	return out;
}
/**
* Calculate the low part of a WebGL 64 bit float
* @param a the input float number
* @returns the lower 32 bit of the number
*/
function fp64LowPart$1(a) {
	return a - Math.fround(a);
}
/**
* Calculate WebGL 64 bit matrix (transposed "Float64Array")
* @param matrix  the input matrix
* @returns the fp64 representation of the input matrix
*/
function fp64ifyMatrix4(matrix) {
	const matrixFP64 = new Float32Array(32);
	for (let i = 0; i < 4; ++i) for (let j = 0; j < 4; ++j) {
		const index = i * 4 + j;
		fp64ify(matrix[j * 4 + i], matrixFP64, index * 2);
	}
	return matrixFP64;
}
/**
* 32 bit math library (fixups for GPUs)
*/
var fp32 = {
	name: "fp32",
	vs: `\
#ifdef LUMA_FP32_TAN_PRECISION_WORKAROUND

// All these functions are for substituting tan() function from Intel GPU only
const float TWO_PI = 6.2831854820251465;
const float PI_2 = 1.5707963705062866;
const float PI_16 = 0.1963495463132858;

const float SIN_TABLE_0 = 0.19509032368659973;
const float SIN_TABLE_1 = 0.3826834261417389;
const float SIN_TABLE_2 = 0.5555702447891235;
const float SIN_TABLE_3 = 0.7071067690849304;

const float COS_TABLE_0 = 0.9807852506637573;
const float COS_TABLE_1 = 0.9238795042037964;
const float COS_TABLE_2 = 0.8314695954322815;
const float COS_TABLE_3 = 0.7071067690849304;

const float INVERSE_FACTORIAL_3 = 1.666666716337204e-01; // 1/3!
const float INVERSE_FACTORIAL_5 = 8.333333767950535e-03; // 1/5!
const float INVERSE_FACTORIAL_7 = 1.9841270113829523e-04; // 1/7!
const float INVERSE_FACTORIAL_9 = 2.75573188446287533e-06; // 1/9!

float sin_taylor_fp32(float a) {
  float r, s, t, x;

  if (a == 0.0) {
    return 0.0;
  }

  x = -a * a;
  s = a;
  r = a;

  r = r * x;
  t = r * INVERSE_FACTORIAL_3;
  s = s + t;

  r = r * x;
  t = r * INVERSE_FACTORIAL_5;
  s = s + t;

  r = r * x;
  t = r * INVERSE_FACTORIAL_7;
  s = s + t;

  r = r * x;
  t = r * INVERSE_FACTORIAL_9;
  s = s + t;

  return s;
}

void sincos_taylor_fp32(float a, out float sin_t, out float cos_t) {
  if (a == 0.0) {
    sin_t = 0.0;
    cos_t = 1.0;
  }
  sin_t = sin_taylor_fp32(a);
  cos_t = sqrt(1.0 - sin_t * sin_t);
}

float tan_taylor_fp32(float a) {
    float sin_a;
    float cos_a;

    if (a == 0.0) {
        return 0.0;
    }

    // 2pi range reduction
    float z = floor(a / TWO_PI);
    float r = a - TWO_PI * z;

    float t;
    float q = floor(r / PI_2 + 0.5);
    int j = int(q);

    if (j < -2 || j > 2) {
        return 1.0 / 0.0;
    }

    t = r - PI_2 * q;

    q = floor(t / PI_16 + 0.5);
    int k = int(q);
    int abs_k = int(abs(float(k)));

    if (abs_k > 4) {
        return 1.0 / 0.0;
    } else {
        t = t - PI_16 * q;
    }

    float u = 0.0;
    float v = 0.0;

    float sin_t, cos_t;
    float s, c;
    sincos_taylor_fp32(t, sin_t, cos_t);

    if (k == 0) {
        s = sin_t;
        c = cos_t;
    } else {
        if (abs(float(abs_k) - 1.0) < 0.5) {
            u = COS_TABLE_0;
            v = SIN_TABLE_0;
        } else if (abs(float(abs_k) - 2.0) < 0.5) {
            u = COS_TABLE_1;
            v = SIN_TABLE_1;
        } else if (abs(float(abs_k) - 3.0) < 0.5) {
            u = COS_TABLE_2;
            v = SIN_TABLE_2;
        } else if (abs(float(abs_k) - 4.0) < 0.5) {
            u = COS_TABLE_3;
            v = SIN_TABLE_3;
        }
        if (k > 0) {
            s = u * sin_t + v * cos_t;
            c = u * cos_t - v * sin_t;
        } else {
            s = u * sin_t - v * cos_t;
            c = u * cos_t + v * sin_t;
        }
    }

    if (j == 0) {
        sin_a = s;
        cos_a = c;
    } else if (j == 1) {
        sin_a = c;
        cos_a = -s;
    } else if (j == -1) {
        sin_a = -c;
        cos_a = s;
    } else {
        sin_a = -s;
        cos_a = -c;
    }
    return sin_a / cos_a;
}
#endif

float tan_fp32(float a) {
#ifdef LUMA_FP32_TAN_PRECISION_WORKAROUND
  return tan_taylor_fp32(a);
#else
  return tan(a);
#endif
}
`
};
//#endregion
//#region node_modules/@luma.gl/shadertools/dist/modules/math/fp64/fp64-arithmetic-glsl.js
var fp64arithmeticShader = `\

layout(std140) uniform fp64arithmeticUniforms {
  uniform float ONE;
  uniform float SPLIT;
} fp64;

/*
About LUMA_FP64_CODE_ELIMINATION_WORKAROUND

The purpose of this workaround is to prevent shader compilers from
optimizing away necessary arithmetic operations by swapping their sequences
or transform the equation to some 'equivalent' form.

These helpers implement Dekker/Veltkamp-style error tracking. If the compiler
folds constants or reassociates the arithmetic, the high/low split can stop
tracking the rounding error correctly. That failure mode tends to look fine in
simple coordinate setup, but then breaks down inside iterative arithmetic such
as fp64 Mandelbrot loops.

The method is to multiply an artifical variable, ONE, which will be known to
the compiler to be 1 only at runtime. The whole expression is then represented
as a polynomial with respective to ONE. In the coefficients of all terms, only one a
and one b should appear

err = (a + b) * ONE^6 - a * ONE^5 - (a + b) * ONE^4 + a * ONE^3 - b - (a + b) * ONE^2 + a * ONE
*/

float prevent_fp64_optimization(float value) {
#if defined(LUMA_FP64_CODE_ELIMINATION_WORKAROUND)
  return value + fp64.ONE * 0.0;
#else
  return value;
#endif
}

// Divide float number to high and low floats to extend fraction bits
vec2 split(float a) {
  // Keep SPLIT as a runtime uniform so the compiler cannot fold the Dekker
  // split into a constant expression and reassociate the recovery steps.
  float split = prevent_fp64_optimization(fp64.SPLIT);
  float t = prevent_fp64_optimization(a * split);
  float temp = t - a;
  float a_hi = t - temp;
  float a_lo = a - a_hi;
  return vec2(a_hi, a_lo);
}

// Divide float number again when high float uses too many fraction bits
vec2 split2(vec2 a) {
  vec2 b = split(a.x);
  b.y += a.y;
  return b;
}

// Special sum operation when a > b
vec2 quickTwoSum(float a, float b) {
#if defined(LUMA_FP64_CODE_ELIMINATION_WORKAROUND)
  float sum = (a + b) * fp64.ONE;
  float err = b - (sum - a) * fp64.ONE;
#else
  float sum = a + b;
  float err = b - (sum - a);
#endif
  return vec2(sum, err);
}

// General sum operation
vec2 twoSum(float a, float b) {
  float s = (a + b);
#if defined(LUMA_FP64_CODE_ELIMINATION_WORKAROUND)
  float v = (s * fp64.ONE - a) * fp64.ONE;
  float err = (a - (s - v) * fp64.ONE) * fp64.ONE * fp64.ONE * fp64.ONE + (b - v);
#else
  float v = s - a;
  float err = (a - (s - v)) + (b - v);
#endif
  return vec2(s, err);
}

vec2 twoSub(float a, float b) {
  float s = (a - b);
#if defined(LUMA_FP64_CODE_ELIMINATION_WORKAROUND)
  float v = (s * fp64.ONE - a) * fp64.ONE;
  float err = (a - (s - v) * fp64.ONE) * fp64.ONE * fp64.ONE * fp64.ONE - (b + v);
#else
  float v = s - a;
  float err = (a - (s - v)) - (b + v);
#endif
  return vec2(s, err);
}

vec2 twoSqr(float a) {
  float prod = a * a;
  vec2 a_fp64 = split(a);
#if defined(LUMA_FP64_CODE_ELIMINATION_WORKAROUND)
  float err = ((a_fp64.x * a_fp64.x - prod) * fp64.ONE + 2.0 * a_fp64.x *
    a_fp64.y * fp64.ONE * fp64.ONE) + a_fp64.y * a_fp64.y * fp64.ONE * fp64.ONE * fp64.ONE;
#else
  float err = ((a_fp64.x * a_fp64.x - prod) + 2.0 * a_fp64.x * a_fp64.y) + a_fp64.y * a_fp64.y;
#endif
  return vec2(prod, err);
}

vec2 twoProd(float a, float b) {
  float prod = a * b;
  vec2 a_fp64 = split(a);
  vec2 b_fp64 = split(b);
  // twoProd is especially sensitive because mul_fp64 and div_fp64 both depend
  // on the split terms and cross terms staying in the original evaluation
  // order. If the compiler folds or reassociates them, the low part tends to
  // collapse to zero or NaN on some drivers.
  float highProduct = prevent_fp64_optimization(a_fp64.x * b_fp64.x);
  float crossProduct1 = prevent_fp64_optimization(a_fp64.x * b_fp64.y);
  float crossProduct2 = prevent_fp64_optimization(a_fp64.y * b_fp64.x);
  float lowProduct = prevent_fp64_optimization(a_fp64.y * b_fp64.y);
#if defined(LUMA_FP64_CODE_ELIMINATION_WORKAROUND)
  float err1 = (highProduct - prod) * fp64.ONE;
  float err2 = crossProduct1 * fp64.ONE * fp64.ONE;
  float err3 = crossProduct2 * fp64.ONE * fp64.ONE * fp64.ONE;
  float err4 = lowProduct * fp64.ONE * fp64.ONE * fp64.ONE * fp64.ONE;
#else
  float err1 = highProduct - prod;
  float err2 = crossProduct1;
  float err3 = crossProduct2;
  float err4 = lowProduct;
#endif
  float err = ((err1 + err2) + err3) + err4;
  return vec2(prod, err);
}

vec2 sum_fp64(vec2 a, vec2 b) {
  vec2 s, t;
  s = twoSum(a.x, b.x);
  t = twoSum(a.y, b.y);
  s.y += t.x;
  s = quickTwoSum(s.x, s.y);
  s.y += t.y;
  s = quickTwoSum(s.x, s.y);
  return s;
}

vec2 sub_fp64(vec2 a, vec2 b) {
  vec2 s, t;
  s = twoSub(a.x, b.x);
  t = twoSub(a.y, b.y);
  s.y += t.x;
  s = quickTwoSum(s.x, s.y);
  s.y += t.y;
  s = quickTwoSum(s.x, s.y);
  return s;
}

vec2 mul_fp64(vec2 a, vec2 b) {
  vec2 prod = twoProd(a.x, b.x);
  // y component is for the error
  prod.y += a.x * b.y;
#if defined(LUMA_FP64_HIGH_BITS_OVERFLOW_WORKAROUND)
  prod = split2(prod);
#endif
  prod = quickTwoSum(prod.x, prod.y);
  prod.y += a.y * b.x;
#if defined(LUMA_FP64_HIGH_BITS_OVERFLOW_WORKAROUND)
  prod = split2(prod);
#endif
  prod = quickTwoSum(prod.x, prod.y);
  return prod;
}

vec2 div_fp64(vec2 a, vec2 b) {
  float xn = 1.0 / b.x;
#if defined(LUMA_FP64_HIGH_BITS_OVERFLOW_WORKAROUND)
  vec2 yn = mul_fp64(a, vec2(xn, 0));
#else
  vec2 yn = a * xn;
#endif
  float diff = (sub_fp64(a, mul_fp64(b, yn))).x;
  vec2 prod = twoProd(xn, diff);
  return sum_fp64(yn, prod);
}

vec2 sqrt_fp64(vec2 a) {
  if (a.x == 0.0 && a.y == 0.0) return vec2(0.0, 0.0);
  if (a.x < 0.0) return vec2(0.0 / 0.0, 0.0 / 0.0);

  float x = 1.0 / sqrt(a.x);
  float yn = a.x * x;
#if defined(LUMA_FP64_CODE_ELIMINATION_WORKAROUND)
  vec2 yn_sqr = twoSqr(yn) * fp64.ONE;
#else
  vec2 yn_sqr = twoSqr(yn);
#endif
  float diff = sub_fp64(a, yn_sqr).x;
  vec2 prod = twoProd(x * 0.5, diff);
#if defined(LUMA_FP64_HIGH_BITS_OVERFLOW_WORKAROUND)
  return sum_fp64(split(yn), prod);
#else
  return sum_fp64(vec2(yn, 0.0), prod);
#endif
}
`;
//#endregion
//#region node_modules/@luma.gl/shadertools/dist/modules/math/fp64/fp64-arithmetic-wgsl.js
var fp64arithmeticWGSL = `\
struct Fp64ArithmeticUniforms {
  ONE: f32,
  SPLIT: f32,
};

@group(0) @binding(auto) var<uniform> fp64arithmetic : Fp64ArithmeticUniforms;

fn fp64_nan(seed: f32) -> f32 {
  let nanBits = 0x7fc00000u | select(0u, 1u, seed < 0.0);
  return bitcast<f32>(nanBits);
}

fn fp64_runtime_zero() -> f32 {
  return fp64arithmetic.ONE * 0.0;
}

fn prevent_fp64_optimization(value: f32) -> f32 {
#ifdef LUMA_FP64_CODE_ELIMINATION_WORKAROUND
  return value + fp64_runtime_zero();
#else
  return value;
#endif
}

fn split(a: f32) -> vec2f {
  let splitValue = prevent_fp64_optimization(fp64arithmetic.SPLIT + fp64_runtime_zero());
  let t = prevent_fp64_optimization(a * splitValue);
  let temp = prevent_fp64_optimization(t - a);
  let aHi = prevent_fp64_optimization(t - temp);
  let aLo = prevent_fp64_optimization(a - aHi);
  return vec2f(aHi, aLo);
}

fn split2(a: vec2f) -> vec2f {
  var b = split(a.x);
  b.y = b.y + a.y;
  return b;
}

fn quickTwoSum(a: f32, b: f32) -> vec2f {
#ifdef LUMA_FP64_CODE_ELIMINATION_WORKAROUND
  let sum = prevent_fp64_optimization((a + b) * fp64arithmetic.ONE);
  let err = prevent_fp64_optimization(b - (sum - a) * fp64arithmetic.ONE);
#else
  let sum = prevent_fp64_optimization(a + b);
  let err = prevent_fp64_optimization(b - (sum - a));
#endif
  return vec2f(sum, err);
}

fn twoSum(a: f32, b: f32) -> vec2f {
  let s = prevent_fp64_optimization(a + b);
#ifdef LUMA_FP64_CODE_ELIMINATION_WORKAROUND
  let v = prevent_fp64_optimization((s * fp64arithmetic.ONE - a) * fp64arithmetic.ONE);
  let err =
    prevent_fp64_optimization((a - (s - v) * fp64arithmetic.ONE) *
      fp64arithmetic.ONE *
      fp64arithmetic.ONE *
      fp64arithmetic.ONE) +
    prevent_fp64_optimization(b - v);
#else
  let v = prevent_fp64_optimization(s - a);
  let err = prevent_fp64_optimization(a - (s - v)) + prevent_fp64_optimization(b - v);
#endif
  return vec2f(s, err);
}

fn twoSub(a: f32, b: f32) -> vec2f {
  let s = prevent_fp64_optimization(a - b);
#ifdef LUMA_FP64_CODE_ELIMINATION_WORKAROUND
  let v = prevent_fp64_optimization((s * fp64arithmetic.ONE - a) * fp64arithmetic.ONE);
  let err =
    prevent_fp64_optimization((a - (s - v) * fp64arithmetic.ONE) *
      fp64arithmetic.ONE *
      fp64arithmetic.ONE *
      fp64arithmetic.ONE) -
    prevent_fp64_optimization(b + v);
#else
  let v = prevent_fp64_optimization(s - a);
  let err = prevent_fp64_optimization(a - (s - v)) - prevent_fp64_optimization(b + v);
#endif
  return vec2f(s, err);
}

fn twoSqr(a: f32) -> vec2f {
  let prod = prevent_fp64_optimization(a * a);
  let aFp64 = split(a);
  let highProduct = prevent_fp64_optimization(aFp64.x * aFp64.x);
  let crossProduct = prevent_fp64_optimization(2.0 * aFp64.x * aFp64.y);
  let lowProduct = prevent_fp64_optimization(aFp64.y * aFp64.y);
#ifdef LUMA_FP64_CODE_ELIMINATION_WORKAROUND
  let err =
    (prevent_fp64_optimization(highProduct - prod) * fp64arithmetic.ONE +
      crossProduct * fp64arithmetic.ONE * fp64arithmetic.ONE) +
    lowProduct * fp64arithmetic.ONE * fp64arithmetic.ONE * fp64arithmetic.ONE;
#else
  let err = ((prevent_fp64_optimization(highProduct - prod) + crossProduct) + lowProduct);
#endif
  return vec2f(prod, err);
}

fn twoProd(a: f32, b: f32) -> vec2f {
  let prod = prevent_fp64_optimization(a * b);
  let aFp64 = split(a);
  let bFp64 = split(b);
  let highProduct = prevent_fp64_optimization(aFp64.x * bFp64.x);
  let crossProduct1 = prevent_fp64_optimization(aFp64.x * bFp64.y);
  let crossProduct2 = prevent_fp64_optimization(aFp64.y * bFp64.x);
  let lowProduct = prevent_fp64_optimization(aFp64.y * bFp64.y);
#ifdef LUMA_FP64_CODE_ELIMINATION_WORKAROUND
  let err1 = (highProduct - prod) * fp64arithmetic.ONE;
  let err2 = crossProduct1 * fp64arithmetic.ONE * fp64arithmetic.ONE;
  let err3 = crossProduct2 * fp64arithmetic.ONE * fp64arithmetic.ONE * fp64arithmetic.ONE;
  let err4 =
    lowProduct *
    fp64arithmetic.ONE *
    fp64arithmetic.ONE *
    fp64arithmetic.ONE *
    fp64arithmetic.ONE;
#else
  let err1 = highProduct - prod;
  let err2 = crossProduct1;
  let err3 = crossProduct2;
  let err4 = lowProduct;
#endif
  let err12InputA = prevent_fp64_optimization(err1);
  let err12InputB = prevent_fp64_optimization(err2);
  let err12 = prevent_fp64_optimization(err12InputA + err12InputB);
  let err123InputA = prevent_fp64_optimization(err12);
  let err123InputB = prevent_fp64_optimization(err3);
  let err123 = prevent_fp64_optimization(err123InputA + err123InputB);
  let err1234InputA = prevent_fp64_optimization(err123);
  let err1234InputB = prevent_fp64_optimization(err4);
  let err = prevent_fp64_optimization(err1234InputA + err1234InputB);
  return vec2f(prod, err);
}

fn sum_fp64(a: vec2f, b: vec2f) -> vec2f {
  var s = twoSum(a.x, b.x);
  let t = twoSum(a.y, b.y);
  s.y = prevent_fp64_optimization(s.y + t.x);
  s = quickTwoSum(s.x, s.y);
  s.y = prevent_fp64_optimization(s.y + t.y);
  s = quickTwoSum(s.x, s.y);
  return s;
}

fn sub_fp64(a: vec2f, b: vec2f) -> vec2f {
  var s = twoSub(a.x, b.x);
  let t = twoSub(a.y, b.y);
  s.y = prevent_fp64_optimization(s.y + t.x);
  s = quickTwoSum(s.x, s.y);
  s.y = prevent_fp64_optimization(s.y + t.y);
  s = quickTwoSum(s.x, s.y);
  return s;
}

fn mul_fp64(a: vec2f, b: vec2f) -> vec2f {
  var prod = twoProd(a.x, b.x);
  let crossProduct1 = prevent_fp64_optimization(a.x * b.y);
  prod.y = prevent_fp64_optimization(prod.y + crossProduct1);
#ifdef LUMA_FP64_HIGH_BITS_OVERFLOW_WORKAROUND
  prod = split2(prod);
#endif
  prod = quickTwoSum(prod.x, prod.y);
  let crossProduct2 = prevent_fp64_optimization(a.y * b.x);
  prod.y = prevent_fp64_optimization(prod.y + crossProduct2);
#ifdef LUMA_FP64_HIGH_BITS_OVERFLOW_WORKAROUND
  prod = split2(prod);
#endif
  prod = quickTwoSum(prod.x, prod.y);
  return prod;
}

fn div_fp64(a: vec2f, b: vec2f) -> vec2f {
  let xn = prevent_fp64_optimization(1.0 / b.x);
  let yn = mul_fp64(a, vec2f(xn, fp64_runtime_zero()));
  let diff = prevent_fp64_optimization(sub_fp64(a, mul_fp64(b, yn)).x);
  let prod = twoProd(xn, diff);
  return sum_fp64(yn, prod);
}

fn sqrt_fp64(a: vec2f) -> vec2f {
  if (a.x == 0.0 && a.y == 0.0) {
    return vec2f(0.0, 0.0);
  }
  if (a.x < 0.0) {
    let nanValue = fp64_nan(a.x);
    return vec2f(nanValue, nanValue);
  }

  let x = prevent_fp64_optimization(1.0 / sqrt(a.x));
  let yn = prevent_fp64_optimization(a.x * x);
#ifdef LUMA_FP64_CODE_ELIMINATION_WORKAROUND
  let ynSqr = twoSqr(yn) * fp64arithmetic.ONE;
#else
  let ynSqr = twoSqr(yn);
#endif
  let diff = prevent_fp64_optimization(sub_fp64(a, ynSqr).x);
  let prod = twoProd(prevent_fp64_optimization(x * 0.5), diff);
#ifdef LUMA_FP64_HIGH_BITS_OVERFLOW_WORKAROUND
  return sum_fp64(split(yn), prod);
#else
  return sum_fp64(vec2f(yn, 0.0), prod);
#endif
}
`;
//#endregion
//#region node_modules/@luma.gl/shadertools/dist/modules/math/fp64/fp64-functions-glsl.js
var fp64functionShader = `\
const vec2 E_FP64 = vec2(2.7182817459106445e+00, 8.254840366817007e-08);
const vec2 LOG2_FP64 = vec2(0.6931471824645996e+00, -1.9046542121259336e-09);
const vec2 PI_FP64 = vec2(3.1415927410125732, -8.742278012618954e-8);
const vec2 TWO_PI_FP64 = vec2(6.2831854820251465, -1.7484556025237907e-7);
const vec2 PI_2_FP64 = vec2(1.5707963705062866, -4.371139006309477e-8);
const vec2 PI_4_FP64 = vec2(0.7853981852531433, -2.1855695031547384e-8);
const vec2 PI_16_FP64 = vec2(0.19634954631328583, -5.463923757886846e-9);
const vec2 PI_16_2_FP64 = vec2(0.39269909262657166, -1.0927847515773692e-8);
const vec2 PI_16_3_FP64 = vec2(0.5890486240386963, -1.4906100798128818e-9);
const vec2 PI_180_FP64 = vec2(0.01745329238474369, 1.3519960498364902e-10);

const vec2 SIN_TABLE_0_FP64 = vec2(0.19509032368659973, -1.6704714833615242e-9);
const vec2 SIN_TABLE_1_FP64 = vec2(0.3826834261417389, 6.22335089017767e-9);
const vec2 SIN_TABLE_2_FP64 = vec2(0.5555702447891235, -1.1769521357507529e-8);
const vec2 SIN_TABLE_3_FP64 = vec2(0.7071067690849304, 1.2101617041793133e-8);

const vec2 COS_TABLE_0_FP64 = vec2(0.9807852506637573, 2.9739473106360492e-8);
const vec2 COS_TABLE_1_FP64 = vec2(0.9238795042037964, 2.8307490351764386e-8);
const vec2 COS_TABLE_2_FP64 = vec2(0.8314695954322815, 1.6870263741530778e-8);
const vec2 COS_TABLE_3_FP64 = vec2(0.7071067690849304, 1.2101617152815436e-8);

const vec2 INVERSE_FACTORIAL_3_FP64 = vec2(1.666666716337204e-01, -4.967053879312289e-09); // 1/3!
const vec2 INVERSE_FACTORIAL_4_FP64 = vec2(4.16666679084301e-02, -1.2417634698280722e-09); // 1/4!
const vec2 INVERSE_FACTORIAL_5_FP64 = vec2(8.333333767950535e-03, -4.34617203337595e-10); // 1/5!
const vec2 INVERSE_FACTORIAL_6_FP64 = vec2(1.3888889225199819e-03, -3.3631094437103215e-11); // 1/6!
const vec2 INVERSE_FACTORIAL_7_FP64 = vec2(1.9841270113829523e-04,  -2.725596874933456e-12); // 1/7!
const vec2 INVERSE_FACTORIAL_8_FP64 = vec2(2.4801587642286904e-05, -3.406996025904184e-13); // 1/8!
const vec2 INVERSE_FACTORIAL_9_FP64 = vec2(2.75573188446287533e-06, 3.7935713937038186e-14); // 1/9!
const vec2 INVERSE_FACTORIAL_10_FP64 = vec2(2.755731998149713e-07, -7.575112367869873e-15); // 1/10!

float nint(float d) {
    if (d == floor(d)) return d;
    return floor(d + 0.5);
}

vec2 nint_fp64(vec2 a) {
    float hi = nint(a.x);
    float lo;
    vec2 tmp;
    if (hi == a.x) {
        lo = nint(a.y);
        tmp = quickTwoSum(hi, lo);
    } else {
        lo = 0.0;
        if (abs(hi - a.x) == 0.5 && a.y < 0.0) {
            hi -= 1.0;
        }
        tmp = vec2(hi, lo);
    }
    return tmp;
}

/* k_power controls how much range reduction we would like to have
Range reduction uses the following method:
assume a = k_power * r + m * log(2), k and m being integers.
Set k_power = 4 (we can choose other k to trade accuracy with performance.
we only need to calculate exp(r) and using exp(a) = 2^m * exp(r)^k_power;
*/

vec2 exp_fp64(vec2 a) {
  // We need to make sure these two numbers match
  // as bit-wise shift is not available in GLSL 1.0
  const int k_power = 4;
  const float k = 16.0;

  const float inv_k = 1.0 / k;

  if (a.x <= -88.0) return vec2(0.0, 0.0);
  if (a.x >= 88.0) return vec2(1.0 / 0.0, 1.0 / 0.0);
  if (a.x == 0.0 && a.y == 0.0) return vec2(1.0, 0.0);
  if (a.x == 1.0 && a.y == 0.0) return E_FP64;

  float m = floor(a.x / LOG2_FP64.x + 0.5);
  vec2 r = sub_fp64(a, mul_fp64(LOG2_FP64, vec2(m, 0.0))) * inv_k;
  vec2 s, t, p;

  p = mul_fp64(r, r);
  s = sum_fp64(r, p * 0.5);
  p = mul_fp64(p, r);
  t = mul_fp64(p, INVERSE_FACTORIAL_3_FP64);

  s = sum_fp64(s, t);
  p = mul_fp64(p, r);
  t = mul_fp64(p, INVERSE_FACTORIAL_4_FP64);

  s = sum_fp64(s, t);
  p = mul_fp64(p, r);
  t = mul_fp64(p, INVERSE_FACTORIAL_5_FP64);

  // s = sum_fp64(s, t);
  // p = mul_fp64(p, r);
  // t = mul_fp64(p, INVERSE_FACTORIAL_6_FP64);

  // s = sum_fp64(s, t);
  // p = mul_fp64(p, r);
  // t = mul_fp64(p, INVERSE_FACTORIAL_7_FP64);

  s = sum_fp64(s, t);


  // At this point, s = exp(r) - 1; but after following 4 recursions, we will get exp(r) ^ 512 - 1.
  for (int i = 0; i < k_power; i++) {
    s = sum_fp64(s * 2.0, mul_fp64(s, s));
  }

#if defined(NVIDIA_FP64_WORKAROUND) || defined(INTEL_FP64_WORKAROUND)
  s = sum_fp64(s, vec2(fp64.ONE, 0.0));
#else
  s = sum_fp64(s, vec2(1.0, 0.0));
#endif

  return s * pow(2.0, m);
//   return r;
}

vec2 log_fp64(vec2 a)
{
  if (a.x == 1.0 && a.y == 0.0) return vec2(0.0, 0.0);
  if (a.x <= 0.0) return vec2(0.0 / 0.0, 0.0 / 0.0);
  vec2 x = vec2(log(a.x), 0.0);
  vec2 s;
#if defined(NVIDIA_FP64_WORKAROUND) || defined(INTEL_FP64_WORKAROUND)
  s = vec2(fp64.ONE, 0.0);
#else
  s = vec2(1.0, 0.0);
#endif

  x = sub_fp64(sum_fp64(x, mul_fp64(a, exp_fp64(-x))), s);
  return x;
}

vec2 sin_taylor_fp64(vec2 a) {
  vec2 r, s, t, x;

  if (a.x == 0.0 && a.y == 0.0) {
    return vec2(0.0, 0.0);
  }

  x = -mul_fp64(a, a);
  s = a;
  r = a;

  r = mul_fp64(r, x);
  t = mul_fp64(r, INVERSE_FACTORIAL_3_FP64);
  s = sum_fp64(s, t);

  r = mul_fp64(r, x);
  t = mul_fp64(r, INVERSE_FACTORIAL_5_FP64);
  s = sum_fp64(s, t);

  /* keep the following commented code in case we need them
  for extra accuracy from the Taylor expansion*/

  // r = mul_fp64(r, x);
  // t = mul_fp64(r, INVERSE_FACTORIAL_7_FP64);
  // s = sum_fp64(s, t);

  // r = mul_fp64(r, x);
  // t = mul_fp64(r, INVERSE_FACTORIAL_9_FP64);
  // s = sum_fp64(s, t);

  return s;
}

vec2 cos_taylor_fp64(vec2 a) {
  vec2 r, s, t, x;

  if (a.x == 0.0 && a.y == 0.0) {
    return vec2(1.0, 0.0);
  }

  x = -mul_fp64(a, a);
  r = x;
  s = sum_fp64(vec2(1.0, 0.0), r * 0.5);

  r = mul_fp64(r, x);
  t = mul_fp64(r, INVERSE_FACTORIAL_4_FP64);
  s = sum_fp64(s, t);

  r = mul_fp64(r, x);
  t = mul_fp64(r, INVERSE_FACTORIAL_6_FP64);
  s = sum_fp64(s, t);

  /* keep the following commented code in case we need them
  for extra accuracy from the Taylor expansion*/

  // r = mul_fp64(r, x);
  // t = mul_fp64(r, INVERSE_FACTORIAL_8_FP64);
  // s = sum_fp64(s, t);

  // r = mul_fp64(r, x);
  // t = mul_fp64(r, INVERSE_FACTORIAL_10_FP64);
  // s = sum_fp64(s, t);

  return s;
}

void sincos_taylor_fp64(vec2 a, out vec2 sin_t, out vec2 cos_t) {
  if (a.x == 0.0 && a.y == 0.0) {
    sin_t = vec2(0.0, 0.0);
    cos_t = vec2(1.0, 0.0);
  }

  sin_t = sin_taylor_fp64(a);
  cos_t = sqrt_fp64(sub_fp64(vec2(1.0, 0.0), mul_fp64(sin_t, sin_t)));
}

vec2 sin_fp64(vec2 a) {
    if (a.x == 0.0 && a.y == 0.0) {
        return vec2(0.0, 0.0);
    }

    // 2pi range reduction
    vec2 z = nint_fp64(div_fp64(a, TWO_PI_FP64));
    vec2 r = sub_fp64(a, mul_fp64(TWO_PI_FP64, z));

    vec2 t;
    float q = floor(r.x / PI_2_FP64.x + 0.5);
    int j = int(q);

    if (j < -2 || j > 2) {
        return vec2(0.0 / 0.0, 0.0 / 0.0);
    }

    t = sub_fp64(r, mul_fp64(PI_2_FP64, vec2(q, 0.0)));

    q = floor(t.x / PI_16_FP64.x + 0.5);
    int k = int(q);

    if (k == 0) {
        if (j == 0) {
            return sin_taylor_fp64(t);
        } else if (j == 1) {
            return cos_taylor_fp64(t);
        } else if (j == -1) {
            return -cos_taylor_fp64(t);
        } else {
            return -sin_taylor_fp64(t);
        }
    }

    int abs_k = int(abs(float(k)));

    if (abs_k > 4) {
        return vec2(0.0 / 0.0, 0.0 / 0.0);
    } else {
        t = sub_fp64(t, mul_fp64(PI_16_FP64, vec2(q, 0.0)));
    }

    vec2 u = vec2(0.0, 0.0);
    vec2 v = vec2(0.0, 0.0);

#if defined(NVIDIA_FP64_WORKAROUND) || defined(INTEL_FP64_WORKAROUND)
    if (abs(float(abs_k) - 1.0) < 0.5) {
        u = COS_TABLE_0_FP64;
        v = SIN_TABLE_0_FP64;
    } else if (abs(float(abs_k) - 2.0) < 0.5) {
        u = COS_TABLE_1_FP64;
        v = SIN_TABLE_1_FP64;
    } else if (abs(float(abs_k) - 3.0) < 0.5) {
        u = COS_TABLE_2_FP64;
        v = SIN_TABLE_2_FP64;
    } else if (abs(float(abs_k) - 4.0) < 0.5) {
        u = COS_TABLE_3_FP64;
        v = SIN_TABLE_3_FP64;
    }
#else
    if (abs_k == 1) {
        u = COS_TABLE_0_FP64;
        v = SIN_TABLE_0_FP64;
    } else if (abs_k == 2) {
        u = COS_TABLE_1_FP64;
        v = SIN_TABLE_1_FP64;
    } else if (abs_k == 3) {
        u = COS_TABLE_2_FP64;
        v = SIN_TABLE_2_FP64;
    } else if (abs_k == 4) {
        u = COS_TABLE_3_FP64;
        v = SIN_TABLE_3_FP64;
    }
#endif

    vec2 sin_t, cos_t;
    sincos_taylor_fp64(t, sin_t, cos_t);



    vec2 result = vec2(0.0, 0.0);
    if (j == 0) {
        if (k > 0) {
            result = sum_fp64(mul_fp64(u, sin_t), mul_fp64(v, cos_t));
        } else {
            result = sub_fp64(mul_fp64(u, sin_t), mul_fp64(v, cos_t));
        }
    } else if (j == 1) {
        if (k > 0) {
            result = sub_fp64(mul_fp64(u, cos_t), mul_fp64(v, sin_t));
        } else {
            result = sum_fp64(mul_fp64(u, cos_t), mul_fp64(v, sin_t));
        }
    } else if (j == -1) {
        if (k > 0) {
            result = sub_fp64(mul_fp64(v, sin_t), mul_fp64(u, cos_t));
        } else {
            result = -sum_fp64(mul_fp64(v, sin_t), mul_fp64(u, cos_t));
        }
    } else {
        if (k > 0) {
            result = -sum_fp64(mul_fp64(u, sin_t), mul_fp64(v, cos_t));
        } else {
            result = sub_fp64(mul_fp64(v, cos_t), mul_fp64(u, sin_t));
        }
    }

    return result;
}

vec2 cos_fp64(vec2 a) {
    if (a.x == 0.0 && a.y == 0.0) {
        return vec2(1.0, 0.0);
    }

    // 2pi range reduction
    vec2 z = nint_fp64(div_fp64(a, TWO_PI_FP64));
    vec2 r = sub_fp64(a, mul_fp64(TWO_PI_FP64, z));

    vec2 t;
    float q = floor(r.x / PI_2_FP64.x + 0.5);
    int j = int(q);

    if (j < -2 || j > 2) {
        return vec2(0.0 / 0.0, 0.0 / 0.0);
    }

    t = sub_fp64(r, mul_fp64(PI_2_FP64, vec2(q, 0.0)));

    q = floor(t.x / PI_16_FP64.x + 0.5);
    int k = int(q);

    if (k == 0) {
        if (j == 0) {
            return cos_taylor_fp64(t);
        } else if (j == 1) {
            return -sin_taylor_fp64(t);
        } else if (j == -1) {
            return sin_taylor_fp64(t);
        } else {
            return -cos_taylor_fp64(t);
        }
    }

    int abs_k = int(abs(float(k)));

    if (abs_k > 4) {
        return vec2(0.0 / 0.0, 0.0 / 0.0);
    } else {
        t = sub_fp64(t, mul_fp64(PI_16_FP64, vec2(q, 0.0)));
    }

    vec2 u = vec2(0.0, 0.0);
    vec2 v = vec2(0.0, 0.0);

#if defined(NVIDIA_FP64_WORKAROUND) || defined(INTEL_FP64_WORKAROUND)
    if (abs(float(abs_k) - 1.0) < 0.5) {
        u = COS_TABLE_0_FP64;
        v = SIN_TABLE_0_FP64;
    } else if (abs(float(abs_k) - 2.0) < 0.5) {
        u = COS_TABLE_1_FP64;
        v = SIN_TABLE_1_FP64;
    } else if (abs(float(abs_k) - 3.0) < 0.5) {
        u = COS_TABLE_2_FP64;
        v = SIN_TABLE_2_FP64;
    } else if (abs(float(abs_k) - 4.0) < 0.5) {
        u = COS_TABLE_3_FP64;
        v = SIN_TABLE_3_FP64;
    }
#else
    if (abs_k == 1) {
        u = COS_TABLE_0_FP64;
        v = SIN_TABLE_0_FP64;
    } else if (abs_k == 2) {
        u = COS_TABLE_1_FP64;
        v = SIN_TABLE_1_FP64;
    } else if (abs_k == 3) {
        u = COS_TABLE_2_FP64;
        v = SIN_TABLE_2_FP64;
    } else if (abs_k == 4) {
        u = COS_TABLE_3_FP64;
        v = SIN_TABLE_3_FP64;
    }
#endif

    vec2 sin_t, cos_t;
    sincos_taylor_fp64(t, sin_t, cos_t);

    vec2 result = vec2(0.0, 0.0);
    if (j == 0) {
        if (k > 0) {
            result = sub_fp64(mul_fp64(u, cos_t), mul_fp64(v, sin_t));
        } else {
            result = sum_fp64(mul_fp64(u, cos_t), mul_fp64(v, sin_t));
        }
    } else if (j == 1) {
        if (k > 0) {
            result = -sum_fp64(mul_fp64(u, sin_t), mul_fp64(v, cos_t));
        } else {
            result = sub_fp64(mul_fp64(v, cos_t), mul_fp64(u, sin_t));
        }
    } else if (j == -1) {
        if (k > 0) {
            result = sum_fp64(mul_fp64(u, sin_t), mul_fp64(v, cos_t));
        } else {
            result = sub_fp64(mul_fp64(u, sin_t), mul_fp64(v, cos_t));
        }
    } else {
        if (k > 0) {
            result = sub_fp64(mul_fp64(v, sin_t), mul_fp64(u, cos_t));
        } else {
            result = -sum_fp64(mul_fp64(u, cos_t), mul_fp64(v, sin_t));
        }
    }

    return result;
}

vec2 tan_fp64(vec2 a) {
    vec2 sin_a;
    vec2 cos_a;

    if (a.x == 0.0 && a.y == 0.0) {
        return vec2(0.0, 0.0);
    }

    // 2pi range reduction
    vec2 z = nint_fp64(div_fp64(a, TWO_PI_FP64));
    vec2 r = sub_fp64(a, mul_fp64(TWO_PI_FP64, z));

    vec2 t;
    float q = floor(r.x / PI_2_FP64.x + 0.5);
    int j = int(q);


    if (j < -2 || j > 2) {
        return vec2(0.0 / 0.0, 0.0 / 0.0);
    }

    t = sub_fp64(r, mul_fp64(PI_2_FP64, vec2(q, 0.0)));

    q = floor(t.x / PI_16_FP64.x + 0.5);
    int k = int(q);
    int abs_k = int(abs(float(k)));

    // We just can't get PI/16 * 3.0 very accurately.
    // so let's just store it
    if (abs_k > 4) {
        return vec2(0.0 / 0.0, 0.0 / 0.0);
    } else {
        t = sub_fp64(t, mul_fp64(PI_16_FP64, vec2(q, 0.0)));
    }


    vec2 u = vec2(0.0, 0.0);
    vec2 v = vec2(0.0, 0.0);

    vec2 sin_t, cos_t;
    vec2 s, c;
    sincos_taylor_fp64(t, sin_t, cos_t);

    if (k == 0) {
        s = sin_t;
        c = cos_t;
    } else {
#if defined(NVIDIA_FP64_WORKAROUND) || defined(INTEL_FP64_WORKAROUND)
        if (abs(float(abs_k) - 1.0) < 0.5) {
            u = COS_TABLE_0_FP64;
            v = SIN_TABLE_0_FP64;
        } else if (abs(float(abs_k) - 2.0) < 0.5) {
            u = COS_TABLE_1_FP64;
            v = SIN_TABLE_1_FP64;
        } else if (abs(float(abs_k) - 3.0) < 0.5) {
            u = COS_TABLE_2_FP64;
            v = SIN_TABLE_2_FP64;
        } else if (abs(float(abs_k) - 4.0) < 0.5) {
            u = COS_TABLE_3_FP64;
            v = SIN_TABLE_3_FP64;
        }
#else
        if (abs_k == 1) {
            u = COS_TABLE_0_FP64;
            v = SIN_TABLE_0_FP64;
        } else if (abs_k == 2) {
            u = COS_TABLE_1_FP64;
            v = SIN_TABLE_1_FP64;
        } else if (abs_k == 3) {
            u = COS_TABLE_2_FP64;
            v = SIN_TABLE_2_FP64;
        } else if (abs_k == 4) {
            u = COS_TABLE_3_FP64;
            v = SIN_TABLE_3_FP64;
        }
#endif
        if (k > 0) {
            s = sum_fp64(mul_fp64(u, sin_t), mul_fp64(v, cos_t));
            c = sub_fp64(mul_fp64(u, cos_t), mul_fp64(v, sin_t));
        } else {
            s = sub_fp64(mul_fp64(u, sin_t), mul_fp64(v, cos_t));
            c = sum_fp64(mul_fp64(u, cos_t), mul_fp64(v, sin_t));
        }
    }

    if (j == 0) {
        sin_a = s;
        cos_a = c;
    } else if (j == 1) {
        sin_a = c;
        cos_a = -s;
    } else if (j == -1) {
        sin_a = -c;
        cos_a = s;
    } else {
        sin_a = -s;
        cos_a = -c;
    }
    return div_fp64(sin_a, cos_a);
}

vec2 radians_fp64(vec2 degree) {
  return mul_fp64(degree, PI_180_FP64);
}

vec2 mix_fp64(vec2 a, vec2 b, float x) {
  vec2 range = sub_fp64(b, a);
  return sum_fp64(a, mul_fp64(range, vec2(x, 0.0)));
}

// Vector functions
// vec2 functions
void vec2_sum_fp64(vec2 a[2], vec2 b[2], out vec2 out_val[2]) {
    out_val[0] = sum_fp64(a[0], b[0]);
    out_val[1] = sum_fp64(a[1], b[1]);
}

void vec2_sub_fp64(vec2 a[2], vec2 b[2], out vec2 out_val[2]) {
    out_val[0] = sub_fp64(a[0], b[0]);
    out_val[1] = sub_fp64(a[1], b[1]);
}

void vec2_mul_fp64(vec2 a[2], vec2 b[2], out vec2 out_val[2]) {
    out_val[0] = mul_fp64(a[0], b[0]);
    out_val[1] = mul_fp64(a[1], b[1]);
}

void vec2_div_fp64(vec2 a[2], vec2 b[2], out vec2 out_val[2]) {
    out_val[0] = div_fp64(a[0], b[0]);
    out_val[1] = div_fp64(a[1], b[1]);
}

void vec2_mix_fp64(vec2 x[2], vec2 y[2], float a, out vec2 out_val[2]) {
  vec2 range[2];
  vec2_sub_fp64(y, x, range);
  vec2 portion[2];
  portion[0] = range[0] * a;
  portion[1] = range[1] * a;
  vec2_sum_fp64(x, portion, out_val);
}

vec2 vec2_length_fp64(vec2 x[2]) {
  return sqrt_fp64(sum_fp64(mul_fp64(x[0], x[0]), mul_fp64(x[1], x[1])));
}

void vec2_normalize_fp64(vec2 x[2], out vec2 out_val[2]) {
  vec2 length = vec2_length_fp64(x);
  vec2 length_vec2[2];
  length_vec2[0] = length;
  length_vec2[1] = length;

  vec2_div_fp64(x, length_vec2, out_val);
}

vec2 vec2_distance_fp64(vec2 x[2], vec2 y[2]) {
  vec2 diff[2];
  vec2_sub_fp64(x, y, diff);
  return vec2_length_fp64(diff);
}

vec2 vec2_dot_fp64(vec2 a[2], vec2 b[2]) {
  vec2 v[2];

  v[0] = mul_fp64(a[0], b[0]);
  v[1] = mul_fp64(a[1], b[1]);

  return sum_fp64(v[0], v[1]);
}

// vec3 functions
void vec3_sub_fp64(vec2 a[3], vec2 b[3], out vec2 out_val[3]) {
  for (int i = 0; i < 3; i++) {
    out_val[i] = sum_fp64(a[i], b[i]);
  }
}

void vec3_sum_fp64(vec2 a[3], vec2 b[3], out vec2 out_val[3]) {
  for (int i = 0; i < 3; i++) {
    out_val[i] = sum_fp64(a[i], b[i]);
  }
}

vec2 vec3_length_fp64(vec2 x[3]) {
  return sqrt_fp64(sum_fp64(sum_fp64(mul_fp64(x[0], x[0]), mul_fp64(x[1], x[1])),
    mul_fp64(x[2], x[2])));
}

vec2 vec3_distance_fp64(vec2 x[3], vec2 y[3]) {
  vec2 diff[3];
  vec3_sub_fp64(x, y, diff);
  return vec3_length_fp64(diff);
}

// vec4 functions
void vec4_fp64(vec4 a, out vec2 out_val[4]) {
  out_val[0].x = a[0];
  out_val[0].y = 0.0;

  out_val[1].x = a[1];
  out_val[1].y = 0.0;

  out_val[2].x = a[2];
  out_val[2].y = 0.0;

  out_val[3].x = a[3];
  out_val[3].y = 0.0;
}

void vec4_scalar_mul_fp64(vec2 a[4], vec2 b, out vec2 out_val[4]) {
  out_val[0] = mul_fp64(a[0], b);
  out_val[1] = mul_fp64(a[1], b);
  out_val[2] = mul_fp64(a[2], b);
  out_val[3] = mul_fp64(a[3], b);
}

void vec4_sum_fp64(vec2 a[4], vec2 b[4], out vec2 out_val[4]) {
  for (int i = 0; i < 4; i++) {
    out_val[i] = sum_fp64(a[i], b[i]);
  }
}

void vec4_dot_fp64(vec2 a[4], vec2 b[4], out vec2 out_val) {
  vec2 v[4];

  v[0] = mul_fp64(a[0], b[0]);
  v[1] = mul_fp64(a[1], b[1]);
  v[2] = mul_fp64(a[2], b[2]);
  v[3] = mul_fp64(a[3], b[3]);

  out_val = sum_fp64(sum_fp64(v[0], v[1]), sum_fp64(v[2], v[3]));
}

void mat4_vec4_mul_fp64(vec2 b[16], vec2 a[4], out vec2 out_val[4]) {
  vec2 tmp[4];

  for (int i = 0; i < 4; i++)
  {
    for (int j = 0; j < 4; j++)
    {
      tmp[j] = b[j + i * 4];
    }
    vec4_dot_fp64(a, tmp, out_val[i]);
  }
}
`;
/**
* 64bit arithmetic: add, sub, mul, div (small subset of fp64 module)
*/
var fp64arithmetic = {
	name: "fp64arithmetic",
	source: fp64arithmeticWGSL,
	fs: fp64arithmeticShader,
	vs: fp64arithmeticShader,
	defaultUniforms: {
		ONE: 1,
		SPLIT: 4097
	},
	uniformTypes: {
		ONE: "f32",
		SPLIT: "f32"
	},
	fp64ify,
	fp64LowPart: fp64LowPart$1,
	fp64ifyMatrix4
};
/**
* Full 64 bit math library
*/
var fp64 = {
	name: "fp64",
	vs: fp64functionShader,
	dependencies: [fp64arithmetic],
	fp64ify,
	fp64LowPart: fp64LowPart$1,
	fp64ifyMatrix4
};
//#endregion
//#region node_modules/@luma.gl/core/dist/adapter/resources/compute-pipeline.js
/**
* A compiled and linked shader program for compute
*/
var ComputePipeline = class ComputePipeline extends Resource {
	get [Symbol.toStringTag]() {
		return "ComputePipeline";
	}
	hash = "";
	/** The merged shader layout */
	shaderLayout;
	constructor(device, props) {
		super(device, props, ComputePipeline.defaultProps);
		this.shaderLayout = props.shaderLayout;
	}
	static defaultProps = {
		...Resource.defaultProps,
		shader: void 0,
		entryPoint: void 0,
		constants: {},
		shaderLayout: void 0
	};
};
//#endregion
//#region node_modules/@luma.gl/core/dist/factories/pipeline-factory.js
/**
* Efficiently creates / caches pipelines
*/
var PipelineFactory = class PipelineFactory {
	static defaultProps = { ...RenderPipeline.defaultProps };
	/** Get the singleton default pipeline factory for the specified device */
	static getDefaultPipelineFactory(device) {
		const moduleData = device.getModuleData("@luma.gl/core");
		moduleData.defaultPipelineFactory ||= new PipelineFactory(device);
		return moduleData.defaultPipelineFactory;
	}
	device;
	_hashCounter = 0;
	_hashes = {};
	_renderPipelineCache = {};
	_computePipelineCache = {};
	_sharedRenderPipelineCache = {};
	get [Symbol.toStringTag]() {
		return "PipelineFactory";
	}
	toString() {
		return `PipelineFactory(${this.device.id})`;
	}
	constructor(device) {
		this.device = device;
	}
	/**
	* WebGL has two cache layers with different priorities:
	* - `_sharedRenderPipelineCache` owns `WEBGLSharedRenderPipeline` / `WebGLProgram` reuse.
	* - `_renderPipelineCache` owns `RenderPipeline` wrapper reuse.
	*
	* Shared WebGL program reuse is the hard requirement. Wrapper reuse is beneficial,
	* but wrapper cache misses are acceptable if that keeps the cache logic simple and
	* prevents incorrect cache hits.
	*
	* In particular, wrapper hash logic must never force program creation or linked-program
	* introspection just to decide whether a shared WebGL program can be reused.
	*/
	/** Return a RenderPipeline matching supplied props. Reuses an equivalent pipeline if already created. */
	createRenderPipeline(props) {
		if (!this.device.props._cachePipelines) return this.device.createRenderPipeline(props);
		const allProps = {
			...RenderPipeline.defaultProps,
			...props
		};
		const cache = this._renderPipelineCache;
		const hash = this._hashRenderPipeline(allProps);
		let pipeline = cache[hash]?.resource;
		if (!pipeline) {
			const sharedRenderPipeline = this.device.type === "webgl" && this.device.props._sharePipelines ? this.createSharedRenderPipeline(allProps) : void 0;
			pipeline = this.device.createRenderPipeline({
				...allProps,
				id: allProps.id ? `${allProps.id}-cached` : uid$1("unnamed-cached"),
				_sharedRenderPipeline: sharedRenderPipeline
			});
			pipeline.hash = hash;
			cache[hash] = {
				resource: pipeline,
				useCount: 1
			};
			if (this.device.props.debugFactories) log.log(3, `${this}: ${pipeline} created, count=${cache[hash].useCount}`)();
		} else {
			cache[hash].useCount++;
			if (this.device.props.debugFactories) log.log(3, `${this}: ${cache[hash].resource} reused, count=${cache[hash].useCount}, (id=${props.id})`)();
		}
		return pipeline;
	}
	/** Return a ComputePipeline matching supplied props. Reuses an equivalent pipeline if already created. */
	createComputePipeline(props) {
		if (!this.device.props._cachePipelines) return this.device.createComputePipeline(props);
		const allProps = {
			...ComputePipeline.defaultProps,
			...props
		};
		const cache = this._computePipelineCache;
		const hash = this._hashComputePipeline(allProps);
		let pipeline = cache[hash]?.resource;
		if (!pipeline) {
			pipeline = this.device.createComputePipeline({
				...allProps,
				id: allProps.id ? `${allProps.id}-cached` : void 0
			});
			pipeline.hash = hash;
			cache[hash] = {
				resource: pipeline,
				useCount: 1
			};
			if (this.device.props.debugFactories) log.log(3, `${this}: ${pipeline} created, count=${cache[hash].useCount}`)();
		} else {
			cache[hash].useCount++;
			if (this.device.props.debugFactories) log.log(3, `${this}: ${cache[hash].resource} reused, count=${cache[hash].useCount}, (id=${props.id})`)();
		}
		return pipeline;
	}
	release(pipeline) {
		if (!this.device.props._cachePipelines) {
			pipeline.destroy();
			return;
		}
		const cache = this._getCache(pipeline);
		const hash = pipeline.hash;
		cache[hash].useCount--;
		if (cache[hash].useCount === 0) {
			this._destroyPipeline(pipeline);
			if (this.device.props.debugFactories) log.log(3, `${this}: ${pipeline} released and destroyed`)();
		} else if (cache[hash].useCount < 0) {
			log.error(`${this}: ${pipeline} released, useCount < 0, resetting`)();
			cache[hash].useCount = 0;
		} else if (this.device.props.debugFactories) log.log(3, `${this}: ${pipeline} released, count=${cache[hash].useCount}`)();
	}
	createSharedRenderPipeline(props) {
		const sharedPipelineHash = this._hashSharedRenderPipeline(props);
		let sharedCacheItem = this._sharedRenderPipelineCache[sharedPipelineHash];
		if (!sharedCacheItem) {
			sharedCacheItem = {
				resource: this.device._createSharedRenderPipelineWebGL(props),
				useCount: 0
			};
			this._sharedRenderPipelineCache[sharedPipelineHash] = sharedCacheItem;
		}
		sharedCacheItem.useCount++;
		return sharedCacheItem.resource;
	}
	releaseSharedRenderPipeline(pipeline) {
		if (!pipeline.sharedRenderPipeline) return;
		const sharedPipelineHash = this._hashSharedRenderPipeline(pipeline.sharedRenderPipeline.props);
		const sharedCacheItem = this._sharedRenderPipelineCache[sharedPipelineHash];
		if (!sharedCacheItem) return;
		sharedCacheItem.useCount--;
		if (sharedCacheItem.useCount === 0) {
			sharedCacheItem.resource.destroy();
			delete this._sharedRenderPipelineCache[sharedPipelineHash];
		}
	}
	/** Destroy a cached pipeline, removing it from the cache if configured to do so. */
	_destroyPipeline(pipeline) {
		const cache = this._getCache(pipeline);
		if (!this.device.props._destroyPipelines) return false;
		delete cache[pipeline.hash];
		pipeline.destroy();
		if (pipeline instanceof RenderPipeline) this.releaseSharedRenderPipeline(pipeline);
		return true;
	}
	/** Get the appropriate cache for the type of pipeline */
	_getCache(pipeline) {
		let cache;
		if (pipeline instanceof ComputePipeline) cache = this._computePipelineCache;
		if (pipeline instanceof RenderPipeline) cache = this._renderPipelineCache;
		if (!cache) throw new Error(`${this}`);
		if (!cache[pipeline.hash]) throw new Error(`${this}: ${pipeline} matched incorrect entry`);
		return cache;
	}
	/** Calculate a hash based on all the inputs for a compute pipeline */
	_hashComputePipeline(props) {
		const { type } = this.device;
		return `${type}/C/${this._getHash(props.shader.source)}SL${this._getHash(JSON.stringify(props.shaderLayout))}`;
	}
	/** Calculate a hash based on all the inputs for a render pipeline */
	_hashRenderPipeline(props) {
		const vsHash = props.vs ? this._getHash(props.vs.source) : 0;
		const fsHash = props.fs ? this._getHash(props.fs.source) : 0;
		const varyingHash = this._getWebGLVaryingHash(props);
		const shaderLayoutHash = this._getHash(JSON.stringify(props.shaderLayout));
		const bufferLayoutHash = this._getHash(JSON.stringify(props.bufferLayout));
		const { type } = this.device;
		switch (type) {
			case "webgl":
				const webglParameterHash = this._getHash(JSON.stringify(props.parameters));
				return `${type}/R/${vsHash}/${fsHash}V${varyingHash}T${props.topology}P${webglParameterHash}SL${shaderLayoutHash}BL${bufferLayoutHash}`;
			default:
				const entryPointHash = this._getHash(JSON.stringify({
					vertexEntryPoint: props.vertexEntryPoint,
					fragmentEntryPoint: props.fragmentEntryPoint
				}));
				const parameterHash = this._getHash(JSON.stringify(props.parameters));
				const attachmentHash = this._getWebGPUAttachmentHash(props);
				return `${type}/R/${vsHash}/${fsHash}V${varyingHash}T${props.topology}EP${entryPointHash}P${parameterHash}SL${shaderLayoutHash}BL${bufferLayoutHash}A${attachmentHash}`;
		}
	}
	_hashSharedRenderPipeline(props) {
		return `webgl/S/${props.vs ? this._getHash(props.vs.source) : 0}/${props.fs ? this._getHash(props.fs.source) : 0}V${this._getWebGLVaryingHash(props)}`;
	}
	_getHash(key) {
		if (this._hashes[key] === void 0) this._hashes[key] = this._hashCounter++;
		return this._hashes[key];
	}
	_getWebGLVaryingHash(props) {
		const { varyings = [], bufferMode = null } = props;
		return this._getHash(JSON.stringify({
			varyings,
			bufferMode
		}));
	}
	_getWebGPUAttachmentHash(props) {
		const colorAttachmentFormats = props.colorAttachmentFormats ?? [this.device.preferredColorFormat];
		const depthStencilAttachmentFormat = props.parameters?.depthWriteEnabled ? props.depthStencilAttachmentFormat || this.device.preferredDepthFormat : null;
		return this._getHash(JSON.stringify({
			colorAttachmentFormats,
			depthStencilAttachmentFormat
		}));
	}
};
//#endregion
//#region node_modules/@luma.gl/core/dist/factories/shader-factory.js
/** Manages a cached pool of Shaders for reuse. */
var ShaderFactory = class ShaderFactory {
	static defaultProps = { ...Shader.defaultProps };
	/** Returns the default ShaderFactory for the given {@link Device}, creating one if necessary. */
	static getDefaultShaderFactory(device) {
		const moduleData = device.getModuleData("@luma.gl/core");
		moduleData.defaultShaderFactory ||= new ShaderFactory(device);
		return moduleData.defaultShaderFactory;
	}
	device;
	_cache = {};
	get [Symbol.toStringTag]() {
		return "ShaderFactory";
	}
	toString() {
		return `${this[Symbol.toStringTag]}(${this.device.id})`;
	}
	/** @internal */
	constructor(device) {
		this.device = device;
	}
	/** Requests a {@link Shader} from the cache, creating a new Shader only if necessary. */
	createShader(props) {
		if (!this.device.props._cacheShaders) return this.device.createShader(props);
		const key = this._hashShader(props);
		let cacheEntry = this._cache[key];
		if (!cacheEntry) {
			const resource = this.device.createShader({
				...props,
				id: props.id ? `${props.id}-cached` : void 0
			});
			this._cache[key] = cacheEntry = {
				resource,
				useCount: 1
			};
			if (this.device.props.debugFactories) log.log(3, `${this}: Created new shader ${resource.id}`)();
		} else {
			cacheEntry.useCount++;
			if (this.device.props.debugFactories) log.log(3, `${this}: Reusing shader ${cacheEntry.resource.id} count=${cacheEntry.useCount}`)();
		}
		return cacheEntry.resource;
	}
	/** Releases a previously-requested {@link Shader}, destroying it if no users remain. */
	release(shader) {
		if (!this.device.props._cacheShaders) {
			shader.destroy();
			return;
		}
		const key = this._hashShader(shader);
		const cacheEntry = this._cache[key];
		if (cacheEntry) {
			cacheEntry.useCount--;
			if (cacheEntry.useCount === 0) {
				if (this.device.props._destroyShaders) {
					delete this._cache[key];
					cacheEntry.resource.destroy();
					if (this.device.props.debugFactories) log.log(3, `${this}: Releasing shader ${shader.id}, destroyed`)();
				}
			} else if (cacheEntry.useCount < 0) throw new Error(`ShaderFactory: Shader ${shader.id} released too many times`);
			else if (this.device.props.debugFactories) log.log(3, `${this}: Releasing shader ${shader.id} count=${cacheEntry.useCount}`)();
		}
	}
	_hashShader(value) {
		return `${value.stage}:${value.source}`;
	}
};
//#endregion
//#region node_modules/@luma.gl/core/dist/shadertypes/shader-types/shader-block-layout.js
/**
* Builds a deterministic shader-block layout from composite shader type declarations.
*
* The returned value is pure layout metadata. It records the packed field
* offsets and exact packed byte length, but it does not allocate buffers or
* serialize values.
*/
function makeShaderBlockLayout(uniformTypes, options = {}) {
	const copiedUniformTypes = { ...uniformTypes };
	const layout = options.layout ?? "std140";
	const fields = {};
	let size = 0;
	for (const [key, uniformType] of Object.entries(copiedUniformTypes)) size = addToLayout(fields, key, uniformType, size, layout);
	size = alignTo(size, getTypeAlignment(copiedUniformTypes, layout));
	return {
		layout,
		byteLength: size * 4,
		uniformTypes: copiedUniformTypes,
		fields
	};
}
/**
* Returns the layout metadata for a scalar, vector, or matrix leaf type.
*
* The result includes both the occupied size in 32-bit words and the alignment
* requirement that must be applied before placing the value in a shader block.
*/
function getLeafLayoutInfo(type, layout) {
	const resolvedType = resolveVariableShaderTypeAlias(type);
	const decodedType = getVariableShaderTypeInfo(resolvedType);
	const matrixMatch = /^mat(\d)x(\d)<.+>$/.exec(resolvedType);
	if (matrixMatch) {
		const columns = Number(matrixMatch[1]);
		const rows = Number(matrixMatch[2]);
		const columnInfo = getVectorLayoutInfo(rows, resolvedType, decodedType.type, layout);
		const columnStride = getMatrixColumnStride(columnInfo.size, columnInfo.alignment, layout);
		return {
			alignment: columnInfo.alignment,
			size: columns * columnStride,
			components: columns * rows,
			columns,
			rows,
			columnStride,
			shaderType: resolvedType,
			type: decodedType.type
		};
	}
	const vectorMatch = /^vec(\d)<.+>$/.exec(resolvedType);
	if (vectorMatch) return getVectorLayoutInfo(Number(vectorMatch[1]), resolvedType, decodedType.type, layout);
	return {
		alignment: 1,
		size: 1,
		components: 1,
		columns: 1,
		rows: 1,
		columnStride: 1,
		shaderType: resolvedType,
		type: decodedType.type
	};
}
/**
* Type guard for composite struct declarations.
*/
function isCompositeShaderTypeStruct(value) {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
/**
* Recursively adds a composite type to the flattened field map.
*
* @returns The next free 32-bit-word offset after the inserted type.
*/
function addToLayout(fields, name, type, offset, layout) {
	if (typeof type === "string") {
		const info = getLeafLayoutInfo(type, layout);
		const alignedOffset = alignTo(offset, info.alignment);
		fields[name] = {
			offset: alignedOffset,
			...info
		};
		return alignedOffset + info.size;
	}
	if (Array.isArray(type)) {
		if (Array.isArray(type[0])) throw new Error(`Nested arrays are not supported for ${name}`);
		const elementType = type[0];
		const length = type[1];
		const stride = getArrayStride(elementType, layout);
		const arrayOffset = alignTo(offset, getTypeAlignment(type, layout));
		for (let i = 0; i < length; i++) addToLayout(fields, `${name}[${i}]`, elementType, arrayOffset + i * stride, layout);
		return arrayOffset + stride * length;
	}
	if (isCompositeShaderTypeStruct(type)) {
		const structAlignment = getTypeAlignment(type, layout);
		let structOffset = alignTo(offset, structAlignment);
		for (const [memberName, memberType] of Object.entries(type)) structOffset = addToLayout(fields, `${name}.${memberName}`, memberType, structOffset, layout);
		return alignTo(structOffset, structAlignment);
	}
	throw new Error(`Unsupported CompositeShaderType for ${name}`);
}
/**
* Returns the occupied size of a composite type in 32-bit words.
*/
function getTypeSize(type, layout) {
	if (typeof type === "string") return getLeafLayoutInfo(type, layout).size;
	if (Array.isArray(type)) {
		const elementType = type[0];
		const length = type[1];
		if (Array.isArray(elementType)) throw new Error("Nested arrays are not supported");
		return getArrayStride(elementType, layout) * length;
	}
	let size = 0;
	for (const memberType of Object.values(type)) {
		const compositeMemberType = memberType;
		size = alignTo(size, getTypeAlignment(compositeMemberType, layout));
		size += getTypeSize(compositeMemberType, layout);
	}
	return alignTo(size, getTypeAlignment(type, layout));
}
/**
* Returns the required alignment of a composite type in 32-bit words.
*/
function getTypeAlignment(type, layout) {
	if (typeof type === "string") return getLeafLayoutInfo(type, layout).alignment;
	if (Array.isArray(type)) {
		const elementType = type[0];
		const elementAlignment = getTypeAlignment(elementType, layout);
		return uses16ByteArrayAlignment(layout) ? Math.max(elementAlignment, 4) : elementAlignment;
	}
	let maxAlignment = 1;
	for (const memberType of Object.values(type)) {
		const memberAlignment = getTypeAlignment(memberType, layout);
		maxAlignment = Math.max(maxAlignment, memberAlignment);
	}
	return uses16ByteStructAlignment(layout) ? Math.max(maxAlignment, 4) : maxAlignment;
}
/**
* Returns the layout metadata for a vector leaf type.
*/
function getVectorLayoutInfo(components, shaderType, type, layout) {
	return {
		alignment: components === 2 ? 2 : 4,
		size: components === 3 ? 3 : components,
		components,
		columns: 1,
		rows: components,
		columnStride: components === 3 ? 3 : components,
		shaderType,
		type
	};
}
/**
* Returns the stride of an array element in 32-bit words.
*
* This includes any layout-specific padding between adjacent array elements.
*/
function getArrayStride(elementType, layout) {
	return getArrayLikeStride(getTypeSize(elementType, layout), getTypeAlignment(elementType, layout), layout);
}
/**
* Returns the common stride rule shared by array-like elements in the target layout.
*/
function getArrayLikeStride(size, alignment, layout) {
	return alignTo(size, uses16ByteArrayAlignment(layout) ? 4 : alignment);
}
/**
* Returns the stride of a matrix column in 32-bit words.
*/
function getMatrixColumnStride(size, alignment, layout) {
	return layout === "std140" ? 4 : alignTo(size, alignment);
}
/**
* Returns `true` when arrays must be rounded up to 16-byte boundaries.
*/
function uses16ByteArrayAlignment(layout) {
	return layout === "std140" || layout === "wgsl-uniform";
}
/**
* Returns `true` when structs must be rounded up to 16-byte boundaries.
*/
function uses16ByteStructAlignment(layout) {
	return layout === "std140" || layout === "wgsl-uniform";
}
//#endregion
//#region node_modules/@luma.gl/core/dist/utils/is-array.js
/**
* Check is an array is a typed array
* @param value value to be tested
* @returns input as TypedArray, or null
* @todo this should be provided by @math.gl/types
*/
function isTypedArray(value) {
	return ArrayBuffer.isView(value) && !(value instanceof DataView);
}
/**
* Check is an array is a numeric array (typed array or array of numbers)
* @param value value to be tested
* @returns input as NumberArray, or null
* @todo this should be provided by @math.gl/types
*/
function isNumberArray(value) {
	if (Array.isArray(value)) return value.length === 0 || typeof value[0] === "number";
	return isTypedArray(value);
}
//#endregion
//#region node_modules/@luma.gl/core/dist/portable/shader-block-writer.js
/**
* Serializes nested JavaScript uniform values according to a {@link ShaderBlockLayout}.
*/
var ShaderBlockWriter = class {
	/** Layout metadata used to flatten and serialize values. */
	layout;
	/**
	* Creates a writer for a precomputed shader-block layout.
	*/
	constructor(layout) {
		this.layout = layout;
	}
	/**
	* Returns `true` if the flattened layout contains the given field.
	*/
	has(name) {
		return Boolean(this.layout.fields[name]);
	}
	/**
	* Returns offset and size metadata for a flattened field.
	*/
	get(name) {
		const entry = this.layout.fields[name];
		return entry ? {
			offset: entry.offset,
			size: entry.size
		} : void 0;
	}
	/**
	* Flattens nested composite values into leaf-path values understood by {@link UniformBlock}.
	*
	* Top-level values may be supplied either in nested object form matching the
	* declared composite shader types or as already-flattened leaf-path values.
	*/
	getFlatUniformValues(uniformValues) {
		const flattenedUniformValues = {};
		for (const [name, value] of Object.entries(uniformValues)) {
			const uniformType = this.layout.uniformTypes[name];
			if (uniformType) this._flattenCompositeValue(flattenedUniformValues, name, uniformType, value);
			else if (this.layout.fields[name]) flattenedUniformValues[name] = value;
		}
		return flattenedUniformValues;
	}
	/**
	* Serializes the supplied values into buffer-backed binary data.
	*
	* The returned view length matches {@link ShaderBlockLayout.byteLength}, which
	* is the exact packed size of the block.
	*/
	getData(uniformValues) {
		const buffer = getScratchArrayBuffer(this.layout.byteLength);
		new Uint8Array(buffer, 0, this.layout.byteLength).fill(0);
		const typedArrays = {
			i32: new Int32Array(buffer),
			u32: new Uint32Array(buffer),
			f32: new Float32Array(buffer),
			f16: new Uint16Array(buffer)
		};
		const flattenedUniformValues = this.getFlatUniformValues(uniformValues);
		for (const [name, value] of Object.entries(flattenedUniformValues)) this._writeLeafValue(typedArrays, name, value);
		return new Uint8Array(buffer, 0, this.layout.byteLength);
	}
	/**
	* Recursively flattens nested values using the declared composite shader type.
	*/
	_flattenCompositeValue(flattenedUniformValues, baseName, uniformType, value) {
		if (value === void 0) return;
		if (typeof uniformType === "string" || this.layout.fields[baseName]) {
			flattenedUniformValues[baseName] = value;
			return;
		}
		if (Array.isArray(uniformType)) {
			const elementType = uniformType[0];
			const length = uniformType[1];
			if (Array.isArray(elementType)) throw new Error(`Nested arrays are not supported for ${baseName}`);
			if (typeof elementType === "string" && isNumberArray(value)) {
				this._flattenPackedArray(flattenedUniformValues, baseName, elementType, length, value);
				return;
			}
			if (!Array.isArray(value)) {
				log.warn(`Unsupported uniform array value for ${baseName}:`, value)();
				return;
			}
			for (let index = 0; index < Math.min(value.length, length); index++) {
				const elementValue = value[index];
				if (elementValue === void 0) continue;
				this._flattenCompositeValue(flattenedUniformValues, `${baseName}[${index}]`, elementType, elementValue);
			}
			return;
		}
		if (isCompositeShaderTypeStruct(uniformType) && isCompositeUniformObject(value)) {
			for (const [key, subValue] of Object.entries(value)) {
				if (subValue === void 0) continue;
				const nestedName = `${baseName}.${key}`;
				this._flattenCompositeValue(flattenedUniformValues, nestedName, uniformType[key], subValue);
			}
			return;
		}
		log.warn(`Unsupported uniform value for ${baseName}:`, value)();
	}
	/**
	* Expands tightly packed numeric arrays into per-element leaf fields.
	*/
	_flattenPackedArray(flattenedUniformValues, baseName, elementType, length, value) {
		const numericValue = value;
		const packedElementLength = getLeafLayoutInfo(elementType, this.layout.layout).components;
		for (let index = 0; index < length; index++) {
			const start = index * packedElementLength;
			if (start >= numericValue.length) break;
			if (packedElementLength === 1) flattenedUniformValues[`${baseName}[${index}]`] = Number(numericValue[start]);
			else flattenedUniformValues[`${baseName}[${index}]`] = sliceNumericArray(value, start, start + packedElementLength);
		}
	}
	/**
	* Writes one flattened leaf value into its typed-array view.
	*/
	_writeLeafValue(typedArrays, name, value) {
		const entry = this.layout.fields[name];
		if (!entry) {
			log.warn(`Uniform ${name} not found in layout`)();
			return;
		}
		const { type, components, columns, rows, offset, columnStride } = entry;
		const array = typedArrays[type];
		if (components === 1) {
			array[offset] = Number(value);
			return;
		}
		const sourceValue = value;
		if (columns === 1) {
			for (let componentIndex = 0; componentIndex < components; componentIndex++) array[offset + componentIndex] = Number(sourceValue[componentIndex] ?? 0);
			return;
		}
		let sourceIndex = 0;
		for (let columnIndex = 0; columnIndex < columns; columnIndex++) {
			const columnOffset = offset + columnIndex * columnStride;
			for (let rowIndex = 0; rowIndex < rows; rowIndex++) array[columnOffset + rowIndex] = Number(sourceValue[sourceIndex++] ?? 0);
		}
	}
};
/**
* Type guard for nested uniform objects.
*/
function isCompositeUniformObject(value) {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value) && !ArrayBuffer.isView(value);
}
/**
* Slices a numeric array-like value without changing its numeric representation.
*/
function sliceNumericArray(value, start, end) {
	return Array.prototype.slice.call(value, start, end);
}
//#endregion
//#region node_modules/@luma.gl/core/dist/utils/array-equal.js
var MAX_ELEMENTWISE_ARRAY_COMPARE_LENGTH = 128;
/** Test if two arrays are deep equal, with a small-array length limit that defaults to 16 */
function arrayEqual(a, b, limit = 16) {
	if (a === b) return true;
	const arrayA = a;
	const arrayB = b;
	if (!isNumberArray(arrayA) || !isNumberArray(arrayB)) return false;
	if (arrayA.length !== arrayB.length) return false;
	const maxCompareLength = Math.min(limit, MAX_ELEMENTWISE_ARRAY_COMPARE_LENGTH);
	if (arrayA.length > maxCompareLength) return false;
	for (let i = 0; i < arrayA.length; ++i) if (arrayB[i] !== arrayA[i]) return false;
	return true;
}
/** Copy a value */
function arrayCopy(a) {
	if (isNumberArray(a)) return a.slice();
	return a;
}
//#endregion
//#region node_modules/@luma.gl/core/dist/portable/uniform-block.js
/**
* A uniform block holds values of the of uniform values for one uniform block / buffer.
* It also does some book keeping on what has changed, to minimize unnecessary writes to uniform buffers.
*/
var UniformBlock = class {
	name;
	uniforms = {};
	modifiedUniforms = {};
	modified = true;
	bindingLayout = {};
	needsRedraw = "initialized";
	constructor(props) {
		this.name = props?.name || "unnamed";
		if (props?.name && props?.shaderLayout) {
			const binding = props?.shaderLayout.bindings?.find((binding_) => binding_.type === "uniform" && binding_.name === props?.name);
			if (!binding) throw new Error(props?.name);
			const uniformBlock = binding;
			for (const uniform of uniformBlock.uniforms || []) this.bindingLayout[uniform.name] = uniform;
		}
	}
	/** Set a map of uniforms */
	setUniforms(uniforms) {
		for (const [key, value] of Object.entries(uniforms)) {
			this._setUniform(key, value);
			if (!this.needsRedraw) this.setNeedsRedraw(`${this.name}.${key}=${value}`);
		}
	}
	setNeedsRedraw(reason) {
		this.needsRedraw = this.needsRedraw || reason;
	}
	/** Returns all uniforms */
	getAllUniforms() {
		this.modifiedUniforms = {};
		this.needsRedraw = false;
		return this.uniforms || {};
	}
	/** Set a single uniform */
	_setUniform(key, value) {
		if (arrayEqual(this.uniforms[key], value)) return;
		this.uniforms[key] = arrayCopy(value);
		this.modifiedUniforms[key] = true;
		this.modified = true;
	}
};
//#endregion
//#region node_modules/@luma.gl/core/dist/portable/uniform-store.js
/**
* Smallest buffer size that can be used for uniform buffers.
*
* This is an allocation policy rather than part of {@link ShaderBlockLayout}.
* Layouts report the exact packed size, while the store applies any minimum
* buffer-size rule when allocating GPU buffers.
*
* TODO - does this depend on device?
*/
var minUniformBufferSize = 1024;
/**
* A uniform store holds a uniform values for one or more uniform blocks,
* - It can generate binary data for any uniform buffer
* - It can manage a uniform buffer for each block
* - It can update managed uniform buffers with a single call
* - It performs some book keeping on what has changed to minimize unnecessary writes to uniform buffers.
*/
var UniformStore = class {
	/** Device used to infer layout and allocate buffers. */
	device;
	/** Stores the uniform values for each uniform block */
	uniformBlocks = /* @__PURE__ */ new Map();
	/** Flattened layout metadata for each block. */
	shaderBlockLayouts = /* @__PURE__ */ new Map();
	/** Serializers for block-backed uniform data. */
	shaderBlockWriters = /* @__PURE__ */ new Map();
	/** Actual buffer for the blocks */
	uniformBuffers = /* @__PURE__ */ new Map();
	/**
	* Creates a new {@link UniformStore} for the supplied device and block definitions.
	*/
	constructor(device, blocks) {
		this.device = device;
		for (const [bufferName, block] of Object.entries(blocks)) {
			const uniformBufferName = bufferName;
			const shaderBlockLayout = makeShaderBlockLayout(block.uniformTypes ?? {}, { layout: block.layout ?? getDefaultUniformBufferLayout(device) });
			const shaderBlockWriter = new ShaderBlockWriter(shaderBlockLayout);
			this.shaderBlockLayouts.set(uniformBufferName, shaderBlockLayout);
			this.shaderBlockWriters.set(uniformBufferName, shaderBlockWriter);
			const uniformBlock = new UniformBlock({ name: bufferName });
			uniformBlock.setUniforms(shaderBlockWriter.getFlatUniformValues(block.defaultUniforms || {}));
			this.uniformBlocks.set(uniformBufferName, uniformBlock);
		}
	}
	/** Destroy any managed uniform buffers */
	destroy() {
		for (const uniformBuffer of this.uniformBuffers.values()) uniformBuffer.destroy();
	}
	/**
	* Set uniforms
	*
	* Makes all group properties partial and eagerly propagates changes to any
	* managed GPU buffers.
	*/
	setUniforms(uniforms) {
		for (const [blockName, uniformValues] of Object.entries(uniforms)) {
			const uniformBufferName = blockName;
			const flattenedUniforms = this.shaderBlockWriters.get(uniformBufferName)?.getFlatUniformValues(uniformValues || {});
			this.uniformBlocks.get(uniformBufferName)?.setUniforms(flattenedUniforms || {});
		}
		this.updateUniformBuffers();
	}
	/**
	* Returns the allocation size for the named uniform buffer.
	*
	* This may exceed the packed layout size because minimum buffer-size policy is
	* applied at the store layer.
	*/
	getUniformBufferByteLength(uniformBufferName) {
		const packedByteLength = this.shaderBlockLayouts.get(uniformBufferName)?.byteLength || 0;
		return Math.max(packedByteLength, minUniformBufferSize);
	}
	/**
	* Returns packed binary data that can be uploaded to the named uniform buffer.
	*
	* The returned view length matches the packed block size and is not padded to
	* the store's minimum allocation size.
	*/
	getUniformBufferData(uniformBufferName) {
		const uniformValues = this.uniformBlocks.get(uniformBufferName)?.getAllUniforms() || {};
		return this.shaderBlockWriters.get(uniformBufferName)?.getData(uniformValues) || new Uint8Array(0);
	}
	/**
	* Creates an unmanaged uniform buffer initialized with the current or supplied values.
	*/
	createUniformBuffer(uniformBufferName, uniforms) {
		if (uniforms) this.setUniforms(uniforms);
		const byteLength = this.getUniformBufferByteLength(uniformBufferName);
		const uniformBuffer = this.device.createBuffer({
			usage: Buffer.UNIFORM | Buffer.COPY_DST,
			byteLength
		});
		const uniformBufferData = this.getUniformBufferData(uniformBufferName);
		uniformBuffer.write(uniformBufferData);
		return uniformBuffer;
	}
	/** Returns the managed uniform buffer for the named block. */
	getManagedUniformBuffer(uniformBufferName) {
		if (!this.uniformBuffers.get(uniformBufferName)) {
			const byteLength = this.getUniformBufferByteLength(uniformBufferName);
			const uniformBuffer = this.device.createBuffer({
				usage: Buffer.UNIFORM | Buffer.COPY_DST,
				byteLength
			});
			this.uniformBuffers.set(uniformBufferName, uniformBuffer);
		}
		return this.uniformBuffers.get(uniformBufferName);
	}
	/**
	* Updates every managed uniform buffer whose source uniforms have changed.
	*
	* @returns The first redraw reason encountered, or `false` if nothing changed.
	*/
	updateUniformBuffers() {
		let reason = false;
		for (const uniformBufferName of this.uniformBlocks.keys()) {
			const bufferReason = this.updateUniformBuffer(uniformBufferName);
			reason ||= bufferReason;
		}
		if (reason) log.log(3, `UniformStore.updateUniformBuffers(): ${reason}`)();
		return reason;
	}
	/**
	* Updates one managed uniform buffer if its corresponding block is dirty.
	*
	* @returns The redraw reason for the update, or `false` if no write occurred.
	*/
	updateUniformBuffer(uniformBufferName) {
		const uniformBlock = this.uniformBlocks.get(uniformBufferName);
		let uniformBuffer = this.uniformBuffers.get(uniformBufferName);
		let reason = false;
		if (uniformBuffer && uniformBlock?.needsRedraw) {
			reason ||= uniformBlock.needsRedraw;
			const uniformBufferData = this.getUniformBufferData(uniformBufferName);
			uniformBuffer = this.uniformBuffers.get(uniformBufferName);
			uniformBuffer?.write(uniformBufferData);
			const uniformValues = this.uniformBlocks.get(uniformBufferName)?.getAllUniforms();
			log.log(4, `Writing to uniform buffer ${String(uniformBufferName)}`, uniformBufferData, uniformValues)();
		}
		return reason;
	}
};
/**
* Returns the default uniform-buffer layout for the supplied device.
*/
function getDefaultUniformBufferLayout(device) {
	return device.type === "webgpu" ? "wgsl-uniform" : "std140";
}
//#endregion
//#region node_modules/@deck.gl/core/dist/shaderlib/misc/geometry.js
var source = `\
const SMOOTH_EDGE_RADIUS: f32 = 0.5;

struct VertexGeometry {
  position: vec4<f32>,
  worldPosition: vec3<f32>,
  worldPositionAlt: vec3<f32>,
  normal: vec3<f32>,
  uv: vec2<f32>,
  pickingColor: vec3<f32>,
};

var<private> geometry_: VertexGeometry = VertexGeometry(
  vec4<f32>(0.0, 0.0, 1.0, 0.0),
  vec3<f32>(0.0, 0.0, 0.0),
  vec3<f32>(0.0, 0.0, 0.0),
  vec3<f32>(0.0, 0.0, 0.0),
  vec2<f32>(0.0, 0.0),
  vec3<f32>(0.0, 0.0, 0.0)
);

struct FragmentGeometry {
  uv: vec2<f32>,
};

var<private> fragmentGeometry: FragmentGeometry;

fn smoothedge(edge: f32, x: f32) -> f32 {
  return smoothstep(edge - SMOOTH_EDGE_RADIUS, edge + SMOOTH_EDGE_RADIUS, x);
}
`;
var defines = "#define SMOOTH_EDGE_RADIUS 0.5";
var geometry_default = {
	name: "geometry",
	source,
	vs: `\
${defines}

struct VertexGeometry {
  vec4 position;
  vec3 worldPosition;
  vec3 worldPositionAlt;
  vec3 normal;
  vec2 uv;
  vec3 pickingColor;
} geometry = VertexGeometry(
  vec4(0.0, 0.0, 1.0, 0.0),
  vec3(0.0),
  vec3(0.0),
  vec3(0.0),
  vec2(0.0),
  vec3(0.0)
);
`,
	fs: `\
${defines}

struct FragmentGeometry {
  vec2 uv;
} geometry;

float smoothedge(float edge, float x) {
  return smoothstep(edge - SMOOTH_EDGE_RADIUS, edge + SMOOTH_EDGE_RADIUS, x);
}
`
};
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/input/input-consts.js
var InputEvent;
(function(InputEvent) {
	InputEvent[InputEvent["Start"] = 1] = "Start";
	InputEvent[InputEvent["Move"] = 2] = "Move";
	InputEvent[InputEvent["End"] = 4] = "End";
	InputEvent[InputEvent["Cancel"] = 8] = "Cancel";
})(InputEvent || (InputEvent = {}));
var InputDirection;
(function(InputDirection) {
	InputDirection[InputDirection["None"] = 0] = "None";
	InputDirection[InputDirection["Left"] = 1] = "Left";
	InputDirection[InputDirection["Right"] = 2] = "Right";
	InputDirection[InputDirection["Up"] = 4] = "Up";
	InputDirection[InputDirection["Down"] = 8] = "Down";
	InputDirection[InputDirection["Horizontal"] = 3] = "Horizontal";
	InputDirection[InputDirection["Vertical"] = 12] = "Vertical";
	InputDirection[InputDirection["All"] = 15] = "All";
})(InputDirection || (InputDirection = {}));
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/recognizer/recognizer-state.js
var RecognizerState;
(function(RecognizerState) {
	RecognizerState[RecognizerState["Possible"] = 1] = "Possible";
	RecognizerState[RecognizerState["Began"] = 2] = "Began";
	RecognizerState[RecognizerState["Changed"] = 4] = "Changed";
	RecognizerState[RecognizerState["Ended"] = 8] = "Ended";
	RecognizerState[RecognizerState["Recognized"] = 8] = "Recognized";
	RecognizerState[RecognizerState["Cancelled"] = 16] = "Cancelled";
	RecognizerState[RecognizerState["Failed"] = 32] = "Failed";
})(RecognizerState || (RecognizerState = {}));
var TOUCH_ACTION_AUTO = "auto";
var TOUCH_ACTION_MANIPULATION = "manipulation";
var TOUCH_ACTION_NONE = "none";
var TOUCH_ACTION_PAN_X = "pan-x";
var TOUCH_ACTION_PAN_Y = "pan-y";
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/touchaction/clean-touch-actions.js
/**
* when the touchActions are collected they are not a valid value, so we need to clean things up. *
* @returns valid touchAction
*/
function cleanTouchActions(actions) {
	if (actions.includes("none")) return TOUCH_ACTION_NONE;
	const hasPanX = actions.includes(TOUCH_ACTION_PAN_X);
	const hasPanY = actions.includes(TOUCH_ACTION_PAN_Y);
	if (hasPanX && hasPanY) return TOUCH_ACTION_NONE;
	if (hasPanX || hasPanY) return hasPanX ? TOUCH_ACTION_PAN_X : TOUCH_ACTION_PAN_Y;
	if (actions.includes("manipulation")) return TOUCH_ACTION_MANIPULATION;
	return TOUCH_ACTION_AUTO;
}
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/touchaction/touchaction.js
/**
* Touch Action
* sets the touchAction property or uses the js alternative
*/
var TouchAction = class {
	constructor(manager, value) {
		this.actions = "";
		this.manager = manager;
		this.set(value);
	}
	/**
	* set the touchAction value on the element or enable the polyfill
	*/
	set(value) {
		if (value === "compute") value = this.compute();
		if (this.manager.element) {
			this.manager.element.style.touchAction = value;
			this.actions = value;
		}
	}
	/**
	* just re-set the touchAction value
	*/
	update() {
		this.set(this.manager.options.touchAction);
	}
	/**
	* compute the value for the touchAction property based on the recognizer's settings
	*/
	compute() {
		let actions = [];
		for (const recognizer of this.manager.recognizers) if (recognizer.options.enable) actions = actions.concat(recognizer.getTouchAction());
		return cleanTouchActions(actions.join(" "));
	}
};
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/utils/split-str.js
/**
* split string on whitespace
* @returns {Array} words
*/
function splitStr(str) {
	return str.trim().split(/\s+/g);
}
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/utils/event-listeners.js
/**
* addEventListener with multiple events at once
*/
function addEventListeners(target, types, handler) {
	if (!target) return;
	for (const type of splitStr(types)) target.addEventListener(type, handler, false);
}
/**
* removeEventListener with multiple events at once
*/
function removeEventListeners(target, types, handler) {
	if (!target) return;
	for (const type of splitStr(types)) target.removeEventListener(type, handler, false);
}
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/utils/get-window-for-element.js
/**
* get the window object of an element
*/
function getWindowForElement(element) {
	return (element.ownerDocument || element).defaultView;
}
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/utils/has-parent.js
/**
* find if a node is in the given parent
*/
function hasParent(node, parent) {
	let ancestor = node;
	while (ancestor) {
		if (ancestor === parent) return true;
		ancestor = ancestor.parentNode;
	}
	return false;
}
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/input/get-center.js
/**
* get the center of all the pointers
*/
function getCenter(pointers) {
	const pointersLength = pointers.length;
	if (pointersLength === 1) return {
		x: Math.round(pointers[0].clientX),
		y: Math.round(pointers[0].clientY)
	};
	let x = 0;
	let y = 0;
	let i = 0;
	while (i < pointersLength) {
		x += pointers[i].clientX;
		y += pointers[i].clientY;
		i++;
	}
	return {
		x: Math.round(x / pointersLength),
		y: Math.round(y / pointersLength)
	};
}
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/input/simple-clone-input-data.js
/**
* create a simple clone from the input used for storage of firstInput and firstMultiple
*/
function simpleCloneInputData(input) {
	const pointers = [];
	let i = 0;
	while (i < input.pointers.length) {
		pointers[i] = {
			clientX: Math.round(input.pointers[i].clientX),
			clientY: Math.round(input.pointers[i].clientY)
		};
		i++;
	}
	return {
		timeStamp: Date.now(),
		pointers,
		center: getCenter(pointers),
		deltaX: input.deltaX,
		deltaY: input.deltaY
	};
}
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/input/get-distance.js
/**
* calculate the absolute distance between two points
* @returns distance
*/
function getPointDistance(p1, p2) {
	const x = p2.x - p1.x;
	const y = p2.y - p1.y;
	return Math.sqrt(x * x + y * y);
}
/**
* calculate the absolute distance between two pointer events
* @returns distance
*/
function getEventDistance(p1, p2) {
	const x = p2.clientX - p1.clientX;
	const y = p2.clientY - p1.clientY;
	return Math.sqrt(x * x + y * y);
}
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/input/get-angle.js
/**
* calculate the angle between two coordinates
* @returns angle in degrees
*/
function getPointAngle(p1, p2) {
	const x = p2.x - p1.x;
	const y = p2.y - p1.y;
	return Math.atan2(y, x) * 180 / Math.PI;
}
/**
* calculate the angle between two pointer events
* @returns angle in degrees
*/
function getEventAngle(p1, p2) {
	const x = p2.clientX - p1.clientX;
	const y = p2.clientY - p1.clientY;
	return Math.atan2(y, x) * 180 / Math.PI;
}
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/input/get-direction.js
/**
* get the direction between two points
* @returns direction
*/
function getDirection(dx, dy) {
	if (dx === dy) return InputDirection.None;
	if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? InputDirection.Left : InputDirection.Right;
	return dy < 0 ? InputDirection.Up : InputDirection.Down;
}
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/input/get-delta-xy.js
/** Populates input.deltaX, input.deltaY */
function computeDeltaXY(session, input) {
	const center = input.center;
	let offset = session.offsetDelta;
	let prevDelta = session.prevDelta;
	const prevInput = session.prevInput;
	if (input.eventType === InputEvent.Start || prevInput?.eventType === InputEvent.End) {
		prevDelta = session.prevDelta = {
			x: prevInput?.deltaX || 0,
			y: prevInput?.deltaY || 0
		};
		offset = session.offsetDelta = {
			x: center.x,
			y: center.y
		};
	}
	return {
		deltaX: prevDelta.x + (center.x - offset.x),
		deltaY: prevDelta.y + (center.y - offset.y)
	};
}
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/input/get-velocity.js
/**
* calculate the velocity between two points. unit is in px per ms.
*/
function getVelocity(deltaTime, x, y) {
	return {
		x: x / deltaTime || 0,
		y: y / deltaTime || 0
	};
}
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/input/get-scale.js
/**
* calculate the scale factor between two pointersets
* no scale is 1, and goes down to 0 when pinched together, and bigger when pinched out
*/
function getScale(start, end) {
	return getEventDistance(end[0], end[1]) / getEventDistance(start[0], start[1]);
}
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/input/get-rotation.js
/**
* calculate the rotation degrees between two pointer sets
* @returns rotation in degrees
*/
function getRotation(start, end) {
	return getEventAngle(end[1], end[0]) - getEventAngle(start[1], start[0]);
}
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/input/compute-interval-input-data.js
/**
* velocity is calculated every x ms
*/
function computeIntervalInputData(session, input) {
	const last = session.lastInterval || input;
	const deltaTime = input.timeStamp - last.timeStamp;
	let velocity;
	let velocityX;
	let velocityY;
	let direction;
	if (input.eventType !== InputEvent.Cancel && (deltaTime > 25 || last.velocity === void 0)) {
		const deltaX = input.deltaX - last.deltaX;
		const deltaY = input.deltaY - last.deltaY;
		const v = getVelocity(deltaTime, deltaX, deltaY);
		velocityX = v.x;
		velocityY = v.y;
		velocity = Math.abs(v.x) > Math.abs(v.y) ? v.x : v.y;
		direction = getDirection(deltaX, deltaY);
		session.lastInterval = input;
	} else {
		velocity = last.velocity;
		velocityX = last.velocityX;
		velocityY = last.velocityY;
		direction = last.direction;
	}
	input.velocity = velocity;
	input.velocityX = velocityX;
	input.velocityY = velocityY;
	input.direction = direction;
}
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/input/compute-input-data.js
/**
* extend the data with some usable properties like scale, rotate, velocity etc
*/
function computeInputData(manager, input) {
	const { session } = manager;
	const { pointers } = input;
	const { length: pointersLength } = pointers;
	if (!session.firstInput) session.firstInput = simpleCloneInputData(input);
	if (pointersLength > 1 && !session.firstMultiple) session.firstMultiple = simpleCloneInputData(input);
	else if (pointersLength === 1) session.firstMultiple = false;
	const { firstInput, firstMultiple } = session;
	const offsetCenter = firstMultiple ? firstMultiple.center : firstInput.center;
	const center = input.center = getCenter(pointers);
	input.timeStamp = Date.now();
	input.deltaTime = input.timeStamp - firstInput.timeStamp;
	input.angle = getPointAngle(offsetCenter, center);
	input.distance = getPointDistance(offsetCenter, center);
	const { deltaX, deltaY } = computeDeltaXY(session, input);
	input.deltaX = deltaX;
	input.deltaY = deltaY;
	input.offsetDirection = getDirection(input.deltaX, input.deltaY);
	const overallVelocity = getVelocity(input.deltaTime, input.deltaX, input.deltaY);
	input.overallVelocityX = overallVelocity.x;
	input.overallVelocityY = overallVelocity.y;
	input.overallVelocity = Math.abs(overallVelocity.x) > Math.abs(overallVelocity.y) ? overallVelocity.x : overallVelocity.y;
	input.scale = firstMultiple ? getScale(firstMultiple.pointers, pointers) : 1;
	input.rotation = firstMultiple ? getRotation(firstMultiple.pointers, pointers) : 0;
	input.maxPointers = !session.prevInput ? input.pointers.length : input.pointers.length > session.prevInput.maxPointers ? input.pointers.length : session.prevInput.maxPointers;
	let target = manager.element;
	if (hasParent(input.srcEvent.target, target)) target = input.srcEvent.target;
	input.target = target;
	computeIntervalInputData(session, input);
	return input;
}
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/input/input-handler.js
/**
* handle input events
*/
function inputHandler(manager, eventType, input) {
	const pointersLen = input.pointers.length;
	const changedPointersLen = input.changedPointers.length;
	const isFirst = eventType & InputEvent.Start && pointersLen - changedPointersLen === 0;
	const isFinal = eventType & (InputEvent.End | InputEvent.Cancel) && pointersLen - changedPointersLen === 0;
	input.isFirst = Boolean(isFirst);
	input.isFinal = Boolean(isFinal);
	if (isFirst) manager.session = {};
	input.eventType = eventType;
	const processedInput = computeInputData(manager, input);
	manager.emit("hammer.input", processedInput);
	manager.recognize(processedInput);
	manager.session.prevInput = processedInput;
}
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/input/input.js
/**
* create new input type manager
*/
var Input$1 = class {
	constructor(manager) {
		this.evEl = "";
		this.evWin = "";
		this.evTarget = "";
		/** smaller wrapper around the handler, for the scope and the enabled state of the manager,
		* so when disabled the input events are completely bypassed.
		*/
		this.domHandler = (ev) => {
			if (this.manager.options.enable) this.handler(ev);
		};
		this.manager = manager;
		this.element = manager.element;
		this.target = manager.options.inputTarget || manager.element;
	}
	callback(eventType, input) {
		inputHandler(this.manager, eventType, input);
	}
	/**
	* bind the events
	*/
	init() {
		addEventListeners(this.element, this.evEl, this.domHandler);
		addEventListeners(this.target, this.evTarget, this.domHandler);
		addEventListeners(getWindowForElement(this.element), this.evWin, this.domHandler);
	}
	/**
	* unbind the events
	*/
	destroy() {
		removeEventListeners(this.element, this.evEl, this.domHandler);
		removeEventListeners(this.target, this.evTarget, this.domHandler);
		removeEventListeners(getWindowForElement(this.element), this.evWin, this.domHandler);
	}
};
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/inputs/pointerevent.js
var POINTER_INPUT_MAP = {
	pointerdown: InputEvent.Start,
	pointermove: InputEvent.Move,
	pointerup: InputEvent.End,
	pointercancel: InputEvent.Cancel,
	pointerout: InputEvent.Cancel
};
var POINTER_ELEMENT_EVENTS = "pointerdown";
var POINTER_WINDOW_EVENTS = "pointermove pointerup pointercancel";
/**
* Pointer events input
*/
var PointerEventInput = class extends Input$1 {
	constructor(manager) {
		super(manager);
		this.evEl = POINTER_ELEMENT_EVENTS;
		this.evWin = POINTER_WINDOW_EVENTS;
		this.store = this.manager.session.pointerEvents = [];
		this.init();
	}
	/**
	* handle mouse events
	*/
	handler(ev) {
		const { store } = this;
		let removePointer = false;
		const eventType = POINTER_INPUT_MAP[ev.type];
		const pointerType = ev.pointerType;
		const isTouch = pointerType === "touch";
		let storeIndex = store.findIndex((e) => e.pointerId === ev.pointerId);
		if (eventType & InputEvent.Start && (ev.buttons || isTouch)) {
			if (storeIndex < 0) {
				store.push(ev);
				storeIndex = store.length - 1;
			}
		} else if (eventType & (InputEvent.End | InputEvent.Cancel)) removePointer = true;
		if (storeIndex < 0) return;
		store[storeIndex] = ev;
		this.callback(eventType, {
			pointers: store,
			changedPointers: [ev],
			eventType,
			pointerType,
			srcEvent: ev
		});
		if (removePointer) store.splice(storeIndex, 1);
	}
};
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/utils/prefixed.js
var VENDOR_PREFIXES = [
	"",
	"webkit",
	"Moz",
	"MS",
	"ms",
	"o"
];
/**
* get the prefixed property
* @returns prefixed property name
*/
function prefixed(obj, property) {
	const camelProp = property[0].toUpperCase() + property.slice(1);
	for (const prefix of VENDOR_PREFIXES) {
		const prop = prefix ? prefix + camelProp : property;
		if (prop in obj) return prop;
	}
}
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/manager.js
var STOP = 1;
var FORCED_STOP = 2;
var defaultOptions = {
	touchAction: "compute",
	enable: true,
	inputTarget: null,
	cssProps: {
		/**
		* Disables text selection to improve the dragging gesture. Mainly for desktop browsers.
		*/
		userSelect: "none",
		/**
		* (Webkit) Disable default dragging behavior
		*/
		userDrag: "none",
		/**
		* (iOS only) Disables the default callout shown when you touch and hold a touch target.
		* When you touch and hold a touch target such as a link, Safari displays
		* a callout containing information about the link. This property allows you to disable that callout.
		*/
		touchCallout: "none",
		/**
		* (iOS only) Sets the color of the highlight that appears over a link while it's being tapped.
		*/
		tapHighlightColor: "rgba(0,0,0,0)"
	}
};
/**
* Manager
*/
var Manager = class {
	constructor(element, options) {
		this.options = {
			...defaultOptions,
			...options,
			cssProps: {
				...defaultOptions.cssProps,
				...options.cssProps
			},
			inputTarget: options.inputTarget || element
		};
		this.handlers = {};
		this.session = {};
		this.recognizers = [];
		this.oldCssProps = {};
		this.element = element;
		this.input = new PointerEventInput(this);
		this.touchAction = new TouchAction(this, this.options.touchAction);
		this.toggleCssProps(true);
	}
	/**
	* set options
	*/
	set(options) {
		Object.assign(this.options, options);
		if (options.touchAction) this.touchAction.update();
		if (options.inputTarget) {
			this.input.destroy();
			this.input.target = options.inputTarget;
			this.input.init();
		}
		return this;
	}
	/**
	* stop recognizing for this session.
	* This session will be discarded, when a new [input]start event is fired.
	* When forced, the recognizer cycle is stopped immediately.
	*/
	stop(force) {
		this.session.stopped = force ? FORCED_STOP : STOP;
	}
	/**
	* run the recognizers!
	* called by the inputHandler function on every movement of the pointers (touches)
	* it walks through all the recognizers and tries to detect the gesture that is being made
	*/
	recognize(inputData) {
		const { session } = this;
		if (session.stopped) return;
		if (this.session.prevented) inputData.srcEvent.preventDefault();
		let recognizer;
		const { recognizers } = this;
		let { curRecognizer } = session;
		if (!curRecognizer || curRecognizer && curRecognizer.state & RecognizerState.Recognized) curRecognizer = session.curRecognizer = null;
		let i = 0;
		while (i < recognizers.length) {
			recognizer = recognizers[i];
			if (session.stopped !== FORCED_STOP && (!curRecognizer || recognizer === curRecognizer || recognizer.canRecognizeWith(curRecognizer))) recognizer.recognize(inputData);
			else recognizer.reset();
			if (!curRecognizer && recognizer.state & (RecognizerState.Began | RecognizerState.Changed | RecognizerState.Ended)) curRecognizer = session.curRecognizer = recognizer;
			i++;
		}
	}
	/**
	* get a recognizer by its event name.
	*/
	get(recognizerName) {
		const { recognizers } = this;
		for (let i = 0; i < recognizers.length; i++) if (recognizers[i].options.event === recognizerName) return recognizers[i];
		return null;
	}
	/**
	* add a recognizer to the manager
	* existing recognizers with the same event name will be removed
	*/
	add(recognizer) {
		if (Array.isArray(recognizer)) {
			for (const item of recognizer) this.add(item);
			return this;
		}
		const existing = this.get(recognizer.options.event);
		if (existing) this.remove(existing);
		this.recognizers.push(recognizer);
		recognizer.manager = this;
		this.touchAction.update();
		return recognizer;
	}
	/**
	* remove a recognizer by name or instance
	*/
	remove(recognizerOrName) {
		if (Array.isArray(recognizerOrName)) {
			for (const item of recognizerOrName) this.remove(item);
			return this;
		}
		const recognizer = typeof recognizerOrName === "string" ? this.get(recognizerOrName) : recognizerOrName;
		if (recognizer) {
			const { recognizers } = this;
			const index = recognizers.indexOf(recognizer);
			if (index !== -1) {
				recognizers.splice(index, 1);
				this.touchAction.update();
			}
		}
		return this;
	}
	/**
	* bind event
	*/
	on(events, handler) {
		if (!events || !handler) return;
		const { handlers } = this;
		for (const event of splitStr(events)) {
			handlers[event] = handlers[event] || [];
			handlers[event].push(handler);
		}
	}
	/**
	* unbind event, leave hander blank to remove all handlers
	*/
	off(events, handler) {
		if (!events) return;
		const { handlers } = this;
		for (const event of splitStr(events)) if (!handler) delete handlers[event];
		else if (handlers[event]) handlers[event].splice(handlers[event].indexOf(handler), 1);
	}
	/**
	* emit event to the listeners
	*/
	emit(event, data) {
		const handlers = this.handlers[event] && this.handlers[event].slice();
		if (!handlers || !handlers.length) return;
		const evt = data;
		evt.type = event;
		evt.preventDefault = function() {
			data.srcEvent.preventDefault();
		};
		let i = 0;
		while (i < handlers.length) {
			handlers[i](evt);
			i++;
		}
	}
	/**
	* destroy the manager and unbinds all events
	* it doesn't unbind dom events, that is the user own responsibility
	*/
	destroy() {
		this.toggleCssProps(false);
		this.handlers = {};
		this.session = {};
		this.input.destroy();
		this.element = null;
	}
	/**
	* add/remove the css properties as defined in manager.options.cssProps
	*/
	toggleCssProps(add) {
		const { element } = this;
		if (!element) return;
		for (const [name, value] of Object.entries(this.options.cssProps)) {
			const prop = prefixed(element.style, name);
			if (add) {
				this.oldCssProps[prop] = element.style[prop];
				element.style[prop] = value;
			} else element.style[prop] = this.oldCssProps[prop] || "";
		}
		if (!add) this.oldCssProps = {};
	}
};
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/utils/unique-id.js
/**
* get a unique id
*/
var _uniqueId = 1;
function uniqueId() {
	return _uniqueId++;
}
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/recognizer/state-str.js
/**
* get a usable string, used as event postfix
*/
function stateStr(state) {
	if (state & RecognizerState.Cancelled) return "cancel";
	else if (state & RecognizerState.Ended) return "end";
	else if (state & RecognizerState.Changed) return "move";
	else if (state & RecognizerState.Began) return "start";
	return "";
}
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/recognizer/recognizer.js
/**
* Recognizer flow explained; *
* All recognizers have the initial state of POSSIBLE when a input session starts.
* The definition of a input session is from the first input until the last input, with all it's movement in it. *
* Example session for mouse-input: mousedown -> mousemove -> mouseup
*
* On each recognizing cycle (see Manager.recognize) the .recognize() method is executed
* which determines with state it should be.
*
* If the recognizer has the state FAILED, CANCELLED or RECOGNIZED (equals ENDED), it is reset to
* POSSIBLE to give it another change on the next cycle.
*
*               Possible
*                  |
*            +-----+---------------+
*            |                     |
*      +-----+-----+               |
*      |           |               |
*   Failed      Cancelled          |
*                          +-------+------+
*                          |              |
*                      Recognized       Began
*                                         |
*                                      Changed
*                                         |
*                                  Ended/Recognized
*/
/**
* Recognizer
* Every recognizer needs to extend from this class.
*/
var Recognizer = class {
	constructor(options) {
		this.options = options;
		this.id = uniqueId();
		this.state = RecognizerState.Possible;
		this.simultaneous = {};
		this.requireFail = [];
	}
	/**
	* set options
	*/
	set(options) {
		Object.assign(this.options, options);
		this.manager.touchAction.update();
		return this;
	}
	/**
	* recognize simultaneous with an other recognizer.
	*/
	recognizeWith(recognizerOrName) {
		if (Array.isArray(recognizerOrName)) {
			for (const item of recognizerOrName) this.recognizeWith(item);
			return this;
		}
		let otherRecognizer;
		if (typeof recognizerOrName === "string") {
			otherRecognizer = this.manager.get(recognizerOrName);
			if (!otherRecognizer) throw new Error(`Cannot find recognizer ${recognizerOrName}`);
		} else otherRecognizer = recognizerOrName;
		const { simultaneous } = this;
		if (!simultaneous[otherRecognizer.id]) {
			simultaneous[otherRecognizer.id] = otherRecognizer;
			otherRecognizer.recognizeWith(this);
		}
		return this;
	}
	/**
	* drop the simultaneous link. it doesnt remove the link on the other recognizer.
	*/
	dropRecognizeWith(recognizerOrName) {
		if (Array.isArray(recognizerOrName)) {
			for (const item of recognizerOrName) this.dropRecognizeWith(item);
			return this;
		}
		let otherRecognizer;
		if (typeof recognizerOrName === "string") otherRecognizer = this.manager.get(recognizerOrName);
		else otherRecognizer = recognizerOrName;
		if (otherRecognizer) delete this.simultaneous[otherRecognizer.id];
		return this;
	}
	/**
	* recognizer can only run when an other is failing
	*/
	requireFailure(recognizerOrName) {
		if (Array.isArray(recognizerOrName)) {
			for (const item of recognizerOrName) this.requireFailure(item);
			return this;
		}
		let otherRecognizer;
		if (typeof recognizerOrName === "string") {
			otherRecognizer = this.manager.get(recognizerOrName);
			if (!otherRecognizer) throw new Error(`Cannot find recognizer ${recognizerOrName}`);
		} else otherRecognizer = recognizerOrName;
		const { requireFail } = this;
		if (requireFail.indexOf(otherRecognizer) === -1) {
			requireFail.push(otherRecognizer);
			otherRecognizer.requireFailure(this);
		}
		return this;
	}
	/**
	* drop the requireFailure link. it does not remove the link on the other recognizer.
	*/
	dropRequireFailure(recognizerOrName) {
		if (Array.isArray(recognizerOrName)) {
			for (const item of recognizerOrName) this.dropRequireFailure(item);
			return this;
		}
		let otherRecognizer;
		if (typeof recognizerOrName === "string") otherRecognizer = this.manager.get(recognizerOrName);
		else otherRecognizer = recognizerOrName;
		if (otherRecognizer) {
			const index = this.requireFail.indexOf(otherRecognizer);
			if (index > -1) this.requireFail.splice(index, 1);
		}
		return this;
	}
	/**
	* has require failures boolean
	*/
	hasRequireFailures() {
		return Boolean(this.requireFail.find((recognier) => recognier.options.enable));
	}
	/**
	* if the recognizer can recognize simultaneous with an other recognizer
	*/
	canRecognizeWith(otherRecognizer) {
		return Boolean(this.simultaneous[otherRecognizer.id]);
	}
	/**
	* You should use `tryEmit` instead of `emit` directly to check
	* that all the needed recognizers has failed before emitting.
	*/
	emit(input) {
		if (!input) return;
		const { state } = this;
		if (state < RecognizerState.Ended) this.manager.emit(this.options.event + stateStr(state), input);
		this.manager.emit(this.options.event, input);
		if (input.additionalEvent) this.manager.emit(input.additionalEvent, input);
		if (state >= RecognizerState.Ended) this.manager.emit(this.options.event + stateStr(state), input);
	}
	/**
	* Check that all the require failure recognizers has failed,
	* if true, it emits a gesture event,
	* otherwise, setup the state to FAILED.
	*/
	tryEmit(input) {
		if (this.canEmit()) this.emit(input);
		else this.state = RecognizerState.Failed;
	}
	/**
	* can we emit?
	*/
	canEmit() {
		let i = 0;
		while (i < this.requireFail.length) {
			if (!(this.requireFail[i].state & (RecognizerState.Failed | RecognizerState.Possible))) return false;
			i++;
		}
		return true;
	}
	/**
	* update the recognizer
	*/
	recognize(inputData) {
		const inputDataClone = { ...inputData };
		if (!this.options.enable) {
			this.reset();
			this.state = RecognizerState.Failed;
			return;
		}
		if (this.state & (RecognizerState.Recognized | RecognizerState.Cancelled | RecognizerState.Failed)) this.state = RecognizerState.Possible;
		this.state = this.process(inputDataClone);
		if (this.state & (RecognizerState.Began | RecognizerState.Changed | RecognizerState.Ended | RecognizerState.Cancelled)) this.tryEmit(inputDataClone);
	}
	/**
	* return the event names that are emitted by this recognizer
	*/
	getEventNames() {
		return [this.options.event];
	}
	/**
	* called when the gesture isn't allowed to recognize
	* like when another is being recognized or it is disabled
	*/
	reset() {}
};
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/recognizers/attribute.js
/**
* This recognizer is just used as a base for the simple attribute recognizers.
*/
var AttrRecognizer = class extends Recognizer {
	/**
	* Used to check if it the recognizer receives valid input, like input.distance > 10.
	*/
	attrTest(input) {
		const optionPointers = this.options.pointers;
		return optionPointers === 0 || input.pointers.length === optionPointers;
	}
	/**
	* Process the input and return the state for the recognizer
	*/
	process(input) {
		const { state } = this;
		const { eventType } = input;
		const isRecognized = state & (RecognizerState.Began | RecognizerState.Changed);
		const isValid = this.attrTest(input);
		if (isRecognized && (eventType & InputEvent.Cancel || !isValid)) return state | RecognizerState.Cancelled;
		else if (isRecognized || isValid) {
			if (eventType & InputEvent.End) return state | RecognizerState.Ended;
			else if (!(state & RecognizerState.Began)) return RecognizerState.Began;
			return state | RecognizerState.Changed;
		}
		return RecognizerState.Failed;
	}
};
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/recognizers/tap.js
/**
* A tap is recognized when the pointer is doing a small tap/click. Multiple taps are recognized if they occur
* between the given interval and position. The delay option can be used to recognize multi-taps without firing
* a single tap.
*
* The eventData from the emitted event contains the property `tapCount`, which contains the amount of
* multi-taps being recognized.
*/
var TapRecognizer = class extends Recognizer {
	constructor(options = {}) {
		super({
			enable: true,
			event: "tap",
			pointers: 1,
			taps: 1,
			interval: 300,
			time: 250,
			threshold: 9,
			posThreshold: 10,
			...options
		});
		/** previous time for tap counting */
		this.pTime = null;
		/** previous center for tap counting */
		this.pCenter = null;
		this._timer = null;
		this._input = null;
		this.count = 0;
	}
	getTouchAction() {
		return [TOUCH_ACTION_MANIPULATION];
	}
	process(input) {
		const { options } = this;
		const validPointers = input.pointers.length === options.pointers;
		const validMovement = input.distance < options.threshold;
		const validTouchTime = input.deltaTime < options.time;
		this.reset();
		if (input.eventType & InputEvent.Start && this.count === 0) return this.failTimeout();
		if (validMovement && validTouchTime && validPointers) {
			if (input.eventType !== InputEvent.End) return this.failTimeout();
			const validInterval = this.pTime ? input.timeStamp - this.pTime < options.interval : true;
			const validMultiTap = !this.pCenter || getPointDistance(this.pCenter, input.center) < options.posThreshold;
			this.pTime = input.timeStamp;
			this.pCenter = input.center;
			if (!validMultiTap || !validInterval) this.count = 1;
			else this.count += 1;
			this._input = input;
			if (this.count % options.taps === 0) {
				if (!this.hasRequireFailures()) return RecognizerState.Recognized;
				this._timer = setTimeout(() => {
					this.state = RecognizerState.Recognized;
					this.tryEmit(this._input);
				}, options.interval);
				return RecognizerState.Began;
			}
		}
		return RecognizerState.Failed;
	}
	failTimeout() {
		this._timer = setTimeout(() => {
			this.state = RecognizerState.Failed;
		}, this.options.interval);
		return RecognizerState.Failed;
	}
	reset() {
		clearTimeout(this._timer);
	}
	emit(input) {
		if (this.state === RecognizerState.Recognized) {
			input.tapCount = this.count;
			this.manager.emit(this.options.event, input);
		}
	}
};
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/recognizers/pan.js
var EVENT_NAMES$1 = [
	"",
	"start",
	"move",
	"end",
	"cancel",
	"up",
	"down",
	"left",
	"right"
];
/**
* Pan
* Recognized when the pointer is down and moved in the allowed direction.
*/
var PanRecognizer = class extends AttrRecognizer {
	constructor(options = {}) {
		super({
			enable: true,
			pointers: 1,
			event: "pan",
			threshold: 10,
			direction: InputDirection.All,
			...options
		});
		this.pX = null;
		this.pY = null;
	}
	getTouchAction() {
		const { options: { direction } } = this;
		const actions = [];
		if (direction & InputDirection.Horizontal) actions.push(TOUCH_ACTION_PAN_Y);
		if (direction & InputDirection.Vertical) actions.push(TOUCH_ACTION_PAN_X);
		return actions;
	}
	getEventNames() {
		return EVENT_NAMES$1.map((suffix) => this.options.event + suffix);
	}
	directionTest(input) {
		const { options } = this;
		let hasMoved = true;
		let { distance } = input;
		let { direction } = input;
		const x = input.deltaX;
		const y = input.deltaY;
		if (!(direction & options.direction)) if (options.direction & InputDirection.Horizontal) {
			direction = x === 0 ? InputDirection.None : x < 0 ? InputDirection.Left : InputDirection.Right;
			hasMoved = x !== this.pX;
			distance = Math.abs(input.deltaX);
		} else {
			direction = y === 0 ? InputDirection.None : y < 0 ? InputDirection.Up : InputDirection.Down;
			hasMoved = y !== this.pY;
			distance = Math.abs(input.deltaY);
		}
		input.direction = direction;
		return hasMoved && distance > options.threshold && Boolean(direction & options.direction);
	}
	attrTest(input) {
		return super.attrTest(input) && (Boolean(this.state & RecognizerState.Began) || !(this.state & RecognizerState.Began) && this.directionTest(input));
	}
	emit(input) {
		this.pX = input.deltaX;
		this.pY = input.deltaY;
		const direction = InputDirection[input.direction].toLowerCase();
		if (direction) input.additionalEvent = this.options.event + direction;
		super.emit(input);
	}
};
//#endregion
//#region node_modules/mjolnir.js/dist/hammerjs/recognizers/pinch.js
var EVENT_NAMES = [
	"",
	"start",
	"move",
	"end",
	"cancel",
	"in",
	"out"
];
/**
* Pinch
* Recognized when two or more pointers are moving toward (zoom-in) or away from each other (zoom-out).
*/
var PinchRecognizer = class extends AttrRecognizer {
	constructor(options = {}) {
		super({
			enable: true,
			event: "pinch",
			threshold: 0,
			pointers: 2,
			...options
		});
	}
	getTouchAction() {
		return [TOUCH_ACTION_NONE];
	}
	getEventNames() {
		return EVENT_NAMES.map((suffix) => this.options.event + suffix);
	}
	attrTest(input) {
		return super.attrTest(input) && (Math.abs(input.scale - 1) > this.options.threshold || Boolean(this.state & RecognizerState.Began));
	}
	emit(input) {
		if (input.scale !== 1) {
			const inOut = input.scale < 1 ? "in" : "out";
			input.additionalEvent = this.options.event + inOut;
		}
		super.emit(input);
	}
};
//#endregion
//#region node_modules/mjolnir.js/dist/inputs/input.js
var Input = class {
	constructor(element, callback, options) {
		this.element = element;
		this.callback = callback;
		this.options = options;
	}
};
//#endregion
//#region node_modules/mjolnir.js/dist/utils/globals.js
var userAgent = typeof navigator !== "undefined" && navigator.userAgent ? navigator.userAgent.toLowerCase() : "";
typeof window !== "undefined" || global;
//#endregion
//#region node_modules/mjolnir.js/dist/inputs/wheel-input.js
var firefox = userAgent.indexOf("firefox") !== -1;
var WHEEL_DELTA_MAGIC_SCALER = 4.000244140625;
var WHEEL_DELTA_PER_LINE = 40;
var SHIFT_MULTIPLIER = .25;
var WheelInput = class extends Input {
	constructor(element, callback, options) {
		super(element, callback, {
			enable: true,
			...options
		});
		this.handleEvent = (event) => {
			if (!this.options.enable) return;
			let value = event.deltaY;
			if (globalThis.WheelEvent) {
				if (firefox && event.deltaMode === globalThis.WheelEvent.DOM_DELTA_PIXEL) value /= globalThis.devicePixelRatio;
				if (event.deltaMode === globalThis.WheelEvent.DOM_DELTA_LINE) value *= WHEEL_DELTA_PER_LINE;
			}
			if (value !== 0 && value % WHEEL_DELTA_MAGIC_SCALER === 0) value = Math.floor(value / WHEEL_DELTA_MAGIC_SCALER);
			if (event.shiftKey && value) value = value * SHIFT_MULTIPLIER;
			this.callback({
				type: "wheel",
				center: {
					x: event.clientX,
					y: event.clientY
				},
				delta: -value,
				srcEvent: event,
				pointerType: "mouse",
				target: event.target
			});
		};
		element.addEventListener("wheel", this.handleEvent, { passive: false });
	}
	destroy() {
		this.element.removeEventListener("wheel", this.handleEvent);
	}
	/**
	* Enable this input (begin processing events)
	* if the specified event type is among those handled by this input.
	*/
	enableEventType(eventType, enabled) {
		if (eventType === "wheel") this.options.enable = enabled;
	}
};
//#endregion
//#region node_modules/mjolnir.js/dist/inputs/move-input.js
var MOUSE_EVENTS$1 = [
	"mousedown",
	"mousemove",
	"mouseup",
	"mouseover",
	"mouseout",
	"mouseleave"
];
/**
* Hammer.js swallows 'move' events (for pointer/touch/mouse)
* when the pointer is not down. This class sets up a handler
* specifically for these events to work around this limitation.
* Note that this could be extended to more intelligently handle
* move events across input types, e.g. storing multiple simultaneous
* pointer/touch events, calculating speed/direction, etc.
*/
var MoveInput = class extends Input {
	constructor(element, callback, options) {
		super(element, callback, {
			enable: true,
			...options
		});
		this.handleEvent = (event) => {
			this.handleOverEvent(event);
			this.handleOutEvent(event);
			this.handleEnterEvent(event);
			this.handleLeaveEvent(event);
			this.handleMoveEvent(event);
		};
		this.pressed = false;
		const { enable } = this.options;
		this.enableMoveEvent = enable;
		this.enableLeaveEvent = enable;
		this.enableEnterEvent = enable;
		this.enableOutEvent = enable;
		this.enableOverEvent = enable;
		MOUSE_EVENTS$1.forEach((event) => element.addEventListener(event, this.handleEvent));
	}
	destroy() {
		MOUSE_EVENTS$1.forEach((event) => this.element.removeEventListener(event, this.handleEvent));
	}
	/**
	* Enable this input (begin processing events)
	* if the specified event type is among those handled by this input.
	*/
	enableEventType(eventType, enabled) {
		switch (eventType) {
			case "pointermove":
				this.enableMoveEvent = enabled;
				break;
			case "pointerover":
				this.enableOverEvent = enabled;
				break;
			case "pointerout":
				this.enableOutEvent = enabled;
				break;
			case "pointerenter":
				this.enableEnterEvent = enabled;
				break;
			case "pointerleave":
				this.enableLeaveEvent = enabled;
				break;
			default:
		}
	}
	handleOverEvent(event) {
		if (this.enableOverEvent && event.type === "mouseover") this._emit("pointerover", event);
	}
	handleOutEvent(event) {
		if (this.enableOutEvent && event.type === "mouseout") this._emit("pointerout", event);
	}
	handleEnterEvent(event) {
		if (this.enableEnterEvent && event.type === "mouseenter") this._emit("pointerenter", event);
	}
	handleLeaveEvent(event) {
		if (this.enableLeaveEvent && event.type === "mouseleave") this._emit("pointerleave", event);
	}
	handleMoveEvent(event) {
		if (this.enableMoveEvent) switch (event.type) {
			case "mousedown":
				if (event.button >= 0) this.pressed = true;
				break;
			case "mousemove":
				if (event.buttons === 0) this.pressed = false;
				if (!this.pressed) this._emit("pointermove", event);
				break;
			case "mouseup":
				this.pressed = false;
				break;
			default:
		}
	}
	_emit(type, event) {
		this.callback({
			type,
			center: {
				x: event.clientX,
				y: event.clientY
			},
			srcEvent: event,
			pointerType: "mouse",
			target: event.target
		});
	}
};
//#endregion
//#region node_modules/mjolnir.js/dist/inputs/key-input.js
var KEY_EVENTS = ["keydown", "keyup"];
var KeyInput = class extends Input {
	constructor(element, callback, options) {
		super(element, callback, {
			enable: true,
			tabIndex: 0,
			...options
		});
		this.handleEvent = (event) => {
			const targetElement = event.target || event.srcElement;
			if (targetElement.tagName === "INPUT" && targetElement.type === "text" || targetElement.tagName === "TEXTAREA") return;
			if (this.enableDownEvent && event.type === "keydown") this.callback({
				type: "keydown",
				srcEvent: event,
				key: event.key,
				target: event.target
			});
			if (this.enableUpEvent && event.type === "keyup") this.callback({
				type: "keyup",
				srcEvent: event,
				key: event.key,
				target: event.target
			});
		};
		this.enableDownEvent = this.options.enable;
		this.enableUpEvent = this.options.enable;
		element.tabIndex = this.options.tabIndex;
		element.style.outline = "none";
		KEY_EVENTS.forEach((event) => element.addEventListener(event, this.handleEvent));
	}
	destroy() {
		KEY_EVENTS.forEach((event) => this.element.removeEventListener(event, this.handleEvent));
	}
	/**
	* Enable this input (begin processing events)
	* if the specified event type is among those handled by this input.
	*/
	enableEventType(eventType, enabled) {
		if (eventType === "keydown") this.enableDownEvent = enabled;
		if (eventType === "keyup") this.enableUpEvent = enabled;
	}
};
//#endregion
//#region node_modules/mjolnir.js/dist/inputs/contextmenu-input.js
var ContextmenuInput = class extends Input {
	constructor(element, callback, options) {
		super(element, callback, options);
		this.handleEvent = (event) => {
			if (!this.options.enable) return;
			this.callback({
				type: "contextmenu",
				center: {
					x: event.clientX,
					y: event.clientY
				},
				srcEvent: event,
				pointerType: "mouse",
				target: event.target
			});
		};
		element.addEventListener("contextmenu", this.handleEvent);
	}
	destroy() {
		this.element.removeEventListener("contextmenu", this.handleEvent);
	}
	/**
	* Enable this input (begin processing events)
	* if the specified event type is among those handled by this input.
	*/
	enableEventType(eventType, enabled) {
		if (eventType === "contextmenu") this.options.enable = enabled;
	}
};
//#endregion
//#region node_modules/mjolnir.js/dist/utils/event-utils.js
var DOWN_EVENT = 1;
var MOVE_EVENT = 2;
var UP_EVENT = 4;
var MOUSE_EVENTS = {
	pointerdown: DOWN_EVENT,
	pointermove: MOVE_EVENT,
	pointerup: UP_EVENT,
	mousedown: DOWN_EVENT,
	mousemove: MOVE_EVENT,
	mouseup: UP_EVENT
};
var MOUSE_EVENT_BUTTON_LEFT = 0;
var MOUSE_EVENT_BUTTON_MIDDLE = 1;
var MOUSE_EVENT_BUTTON_RIGHT = 2;
var MOUSE_EVENT_BUTTONS_LEFT_MASK = 1;
var MOUSE_EVENT_BUTTONS_RIGHT_MASK = 2;
var MOUSE_EVENT_BUTTONS_MIDDLE_MASK = 4;
/**
* Extract the involved mouse button
*/
function whichButtons(event) {
	const eventType = MOUSE_EVENTS[event.srcEvent.type];
	if (!eventType) return null;
	const { buttons, button } = event.srcEvent;
	let leftButton = false;
	let middleButton = false;
	let rightButton = false;
	if (eventType === MOVE_EVENT) {
		leftButton = Boolean(buttons & MOUSE_EVENT_BUTTONS_LEFT_MASK);
		middleButton = Boolean(buttons & MOUSE_EVENT_BUTTONS_MIDDLE_MASK);
		rightButton = Boolean(buttons & MOUSE_EVENT_BUTTONS_RIGHT_MASK);
	} else {
		leftButton = button === MOUSE_EVENT_BUTTON_LEFT;
		middleButton = button === MOUSE_EVENT_BUTTON_MIDDLE;
		rightButton = button === MOUSE_EVENT_BUTTON_RIGHT;
	}
	return {
		leftButton,
		middleButton,
		rightButton
	};
}
/**
* Calculate event position relative to the root element
*/
function getOffsetPosition(event, rootElement) {
	const center = event.center;
	if (!center) return null;
	const rect = rootElement.getBoundingClientRect();
	const scaleX = rect.width / rootElement.offsetWidth || 1;
	const scaleY = rect.height / rootElement.offsetHeight || 1;
	return {
		center,
		offsetCenter: {
			x: (center.x - rect.left - rootElement.clientLeft) / scaleX,
			y: (center.y - rect.top - rootElement.clientTop) / scaleY
		}
	};
}
//#endregion
//#region node_modules/mjolnir.js/dist/utils/event-registrar.js
var DEFAULT_OPTIONS = {
	srcElement: "root",
	priority: 0
};
var EventRegistrar = class {
	constructor(eventManager, recognizerName) {
		/**
		* Handles hammerjs event
		*/
		this.handleEvent = (event) => {
			if (this.isEmpty()) return;
			const mjolnirEvent = this._normalizeEvent(event);
			let target = event.srcEvent.target;
			while (target && target !== mjolnirEvent.rootElement) {
				this._emit(mjolnirEvent, target);
				if (mjolnirEvent.handled) return;
				target = target.parentNode;
			}
			this._emit(mjolnirEvent, "root");
		};
		this.eventManager = eventManager;
		this.recognizerName = recognizerName;
		this.handlers = [];
		this.handlersByElement = /* @__PURE__ */ new Map();
		this._active = false;
	}
	isEmpty() {
		return !this._active;
	}
	add(type, handler, options, once = false, passive = false) {
		const { handlers, handlersByElement } = this;
		const opts = {
			...DEFAULT_OPTIONS,
			...options
		};
		let entries = handlersByElement.get(opts.srcElement);
		if (!entries) {
			entries = [];
			handlersByElement.set(opts.srcElement, entries);
		}
		const entry = {
			type,
			handler,
			srcElement: opts.srcElement,
			priority: opts.priority
		};
		if (once) entry.once = true;
		if (passive) entry.passive = true;
		handlers.push(entry);
		this._active = this._active || !entry.passive;
		let insertPosition = entries.length - 1;
		while (insertPosition >= 0) {
			if (entries[insertPosition].priority >= entry.priority) break;
			insertPosition--;
		}
		entries.splice(insertPosition + 1, 0, entry);
	}
	remove(type, handler) {
		const { handlers, handlersByElement } = this;
		for (let i = handlers.length - 1; i >= 0; i--) {
			const entry = handlers[i];
			if (entry.type === type && entry.handler === handler) {
				handlers.splice(i, 1);
				const entries = handlersByElement.get(entry.srcElement);
				entries.splice(entries.indexOf(entry), 1);
				if (entries.length === 0) handlersByElement.delete(entry.srcElement);
			}
		}
		this._active = handlers.some((entry) => !entry.passive);
	}
	/**
	* Invoke handlers on a particular element
	*/
	_emit(event, srcElement) {
		const entries = this.handlersByElement.get(srcElement);
		if (entries) {
			let immediatePropagationStopped = false;
			const stopPropagation = () => {
				event.handled = true;
			};
			const stopImmediatePropagation = () => {
				event.handled = true;
				immediatePropagationStopped = true;
			};
			const entriesToRemove = [];
			for (let i = 0; i < entries.length; i++) {
				const { type, handler, once } = entries[i];
				handler({
					...event,
					type,
					stopPropagation,
					stopImmediatePropagation
				});
				if (once) entriesToRemove.push(entries[i]);
				if (immediatePropagationStopped) break;
			}
			for (let i = 0; i < entriesToRemove.length; i++) {
				const { type, handler } = entriesToRemove[i];
				this.remove(type, handler);
			}
		}
	}
	/**
	* Normalizes hammerjs and custom events to have predictable fields.
	*/
	_normalizeEvent(event) {
		const rootElement = this.eventManager.getElement();
		return {
			...event,
			...whichButtons(event),
			...getOffsetPosition(event, rootElement),
			preventDefault: () => {
				event.srcEvent.preventDefault();
			},
			stopImmediatePropagation: null,
			stopPropagation: null,
			handled: false,
			rootElement
		};
	}
};
//#endregion
//#region node_modules/mjolnir.js/dist/event-manager.js
function normalizeRecognizer(item) {
	if ("recognizer" in item) return item;
	let recognizer;
	const itemArray = Array.isArray(item) ? [...item] : [item];
	if (typeof itemArray[0] === "function") recognizer = new (itemArray.shift())(itemArray.shift() || {});
	else recognizer = itemArray.shift();
	return {
		recognizer,
		recognizeWith: typeof itemArray[0] === "string" ? [itemArray[0]] : itemArray[0],
		requireFailure: typeof itemArray[1] === "string" ? [itemArray[1]] : itemArray[1]
	};
}
var EventManager = class {
	constructor(element = null, options = {}) {
		/**
		* Handle basic events using the 'hammer.input' Hammer.js API:
		* Before running Recognizers, Hammer emits a 'hammer.input' event
		* with the basic event info. This function emits all basic events
		* aliased to the "class" of event received.
		* See constants.BASIC_EVENT_CLASSES basic event class definitions.
		*/
		this._onBasicInput = (event) => {
			this.manager.emit(event.srcEvent.type, event);
		};
		/**
		* Handle events not supported by Hammer.js,
		* and pipe back out through same (Hammer) channel used by other events.
		*/
		this._onOtherEvent = (event) => {
			this.manager.emit(event.type, event);
		};
		this.options = {
			recognizers: [],
			events: {},
			touchAction: "compute",
			tabIndex: 0,
			cssProps: {},
			...options
		};
		this.events = /* @__PURE__ */ new Map();
		this.element = element;
		if (!element) return;
		this.manager = new Manager(element, this.options);
		for (const item of this.options.recognizers) {
			const { recognizer, recognizeWith, requireFailure } = normalizeRecognizer(item);
			this.manager.add(recognizer);
			if (recognizeWith) recognizer.recognizeWith(recognizeWith);
			if (requireFailure) recognizer.requireFailure(requireFailure);
		}
		this.manager.on("hammer.input", this._onBasicInput);
		this.wheelInput = new WheelInput(element, this._onOtherEvent, { enable: false });
		this.moveInput = new MoveInput(element, this._onOtherEvent, { enable: false });
		this.keyInput = new KeyInput(element, this._onOtherEvent, {
			enable: false,
			tabIndex: options.tabIndex
		});
		this.contextmenuInput = new ContextmenuInput(element, this._onOtherEvent, { enable: false });
		this.on(this.options.events);
	}
	getElement() {
		return this.element;
	}
	destroy() {
		if (!this.element) return;
		this.wheelInput.destroy();
		this.moveInput.destroy();
		this.keyInput.destroy();
		this.contextmenuInput.destroy();
		this.manager.destroy();
	}
	/** Register an event handler function to be called on `event` */
	on(event, handler, opts) {
		this._addEventHandler(event, handler, opts, false);
	}
	once(event, handler, opts) {
		this._addEventHandler(event, handler, opts, true);
	}
	watch(event, handler, opts) {
		this._addEventHandler(event, handler, opts, false, true);
	}
	off(event, handler) {
		this._removeEventHandler(event, handler);
	}
	_toggleRecognizer(name, enabled) {
		const { manager } = this;
		if (!manager) return;
		const recognizer = manager.get(name);
		if (recognizer) {
			recognizer.set({ enable: enabled });
			manager.touchAction.update();
		}
		this.wheelInput?.enableEventType(name, enabled);
		this.moveInput?.enableEventType(name, enabled);
		this.keyInput?.enableEventType(name, enabled);
		this.contextmenuInput?.enableEventType(name, enabled);
	}
	/**
	* Process the event registration for a single event + handler.
	*/
	_addEventHandler(event, handler, opts, once, passive) {
		if (typeof event !== "string") {
			opts = handler;
			for (const [eventName, eventHandler] of Object.entries(event)) this._addEventHandler(eventName, eventHandler, opts, once, passive);
			return;
		}
		const { manager, events } = this;
		if (!manager) return;
		let eventRegistrar = events.get(event);
		if (!eventRegistrar) {
			const recognizerName = this._getRecognizerName(event) || event;
			eventRegistrar = new EventRegistrar(this, recognizerName);
			events.set(event, eventRegistrar);
			if (manager) manager.on(event, eventRegistrar.handleEvent);
		}
		eventRegistrar.add(event, handler, opts, once, passive);
		if (!eventRegistrar.isEmpty()) this._toggleRecognizer(eventRegistrar.recognizerName, true);
	}
	/**
	* Process the event deregistration for a single event + handler.
	*/
	_removeEventHandler(event, handler) {
		if (typeof event !== "string") {
			for (const [eventName, eventHandler] of Object.entries(event)) this._removeEventHandler(eventName, eventHandler);
			return;
		}
		const { events } = this;
		const eventRegistrar = events.get(event);
		if (!eventRegistrar) return;
		eventRegistrar.remove(event, handler);
		if (eventRegistrar.isEmpty()) {
			const { recognizerName } = eventRegistrar;
			let isRecognizerUsed = false;
			for (const eh of events.values()) if (eh.recognizerName === recognizerName && !eh.isEmpty()) {
				isRecognizerUsed = true;
				break;
			}
			if (!isRecognizerUsed) this._toggleRecognizer(recognizerName, false);
		}
	}
	_getRecognizerName(event) {
		return this.manager.recognizers.find((recognizer) => {
			return recognizer.getEventNames().includes(event);
		})?.options.event;
	}
};
//#endregion
//#region node_modules/@deck.gl/core/dist/lib/constants.js
/**
* The coordinate system that positions/dimensions are defined in.
* String constants are the public API.
* @deprecated Use string constants directly.
*/
var COORDINATE_SYSTEM = {
	/**
	* `LNGLAT` if rendering into a geospatial viewport, `CARTESIAN` otherwise
	*/
	DEFAULT: "default",
	/**
	* Positions are interpreted as [longitude, latitude, elevation]
	* longitude/latitude are in degrees, elevation is in meters.
	* Dimensions are in meters.
	*/
	LNGLAT: "lnglat",
	/**
	* Positions are interpreted as [x, y, z] in meter offsets from the coordinate origin.
	* Dimensions are in meters.
	*/
	METER_OFFSETS: "meter-offsets",
	/**
	* Positions are interpreted as [deltaLng, deltaLat, elevation] from the coordinate origin.
	* deltaLng/deltaLat are in degrees, elevation is in meters.
	* Dimensions are in meters.
	*/
	LNGLAT_OFFSETS: "lnglat-offsets",
	/**
	* Positions and dimensions are in the common units of the viewport.
	*/
	CARTESIAN: "cartesian"
};
Object.defineProperty(COORDINATE_SYSTEM, "IDENTITY", { get: () => {
	defaultLogger.deprecated("COORDINATE_SYSTEM.IDENTITY", "COORDINATE_SYSTEM.CARTESIAN")();
	return COORDINATE_SYSTEM.CARTESIAN;
} });
/**
* How coordinates are transformed from the world space into the common space.
*/
var PROJECTION_MODE = {
	/**
	* Render geospatial data in Web Mercator projection
	*/
	WEB_MERCATOR: 1,
	/**
	* Render geospatial data as a 3D globe
	*/
	GLOBE: 2,
	/**
	* (Internal use only) Web Mercator projection at high zoom
	*/
	WEB_MERCATOR_AUTO_OFFSET: 4,
	/**
	* No transformation
	*/
	IDENTITY: 0
};
var UNIT = {
	common: 0,
	meters: 1,
	pixels: 2
};
var EVENT_HANDLERS = {
	click: "onClick",
	dblclick: "onClick",
	panstart: "onDragStart",
	panmove: "onDrag",
	panend: "onDragEnd"
};
var RECOGNIZERS = {
	multipan: [PanRecognizer, {
		threshold: 10,
		direction: InputDirection.Vertical,
		pointers: 2
	}],
	pinch: [
		PinchRecognizer,
		{},
		null,
		["multipan"]
	],
	pan: [
		PanRecognizer,
		{ threshold: 1 },
		["pinch"],
		["multipan"]
	],
	dblclick: [TapRecognizer, {
		event: "dblclick",
		taps: 2
	}],
	click: [
		TapRecognizer,
		{ event: "click" },
		null,
		["dblclick"]
	]
};
//#endregion
//#region node_modules/@deck.gl/core/dist/utils/memoize.js
function isEqual(a, b) {
	if (a === b) return true;
	if (Array.isArray(a)) {
		const len = a.length;
		if (!b || b.length !== len) return false;
		for (let i = 0; i < len; i++) if (a[i] !== b[i]) return false;
		return true;
	}
	return false;
}
/**
* Speed up consecutive function calls by caching the result of calls with identical input
* https://en.wikipedia.org/wiki/Memoization
* @param {function} compute - the function to be memoized
*/
function memoize(compute) {
	let cachedArgs = {};
	let cachedResult;
	return (args) => {
		for (const key in args) if (!isEqual(args[key], cachedArgs[key])) {
			cachedResult = compute(args);
			cachedArgs = args;
			break;
		}
		return cachedResult;
	};
}
//#endregion
//#region node_modules/@deck.gl/core/dist/shaderlib/project/viewport-uniforms.js
var ZERO_VECTOR$1 = [
	0,
	0,
	0,
	0
];
var VECTOR_TO_POINT_MATRIX = [
	1,
	0,
	0,
	0,
	0,
	1,
	0,
	0,
	0,
	0,
	1,
	0,
	0,
	0,
	0,
	0
];
var IDENTITY_MATRIX = [
	1,
	0,
	0,
	0,
	0,
	1,
	0,
	0,
	0,
	0,
	1,
	0,
	0,
	0,
	0,
	1
];
var DEFAULT_PIXELS_PER_UNIT2 = [
	0,
	0,
	0
];
var DEFAULT_COORDINATE_ORIGIN = [
	0,
	0,
	0
];
/** Coordinate system constants */
var COORDINATE_SYSTEM_NUMBERS = {
	default: -1,
	cartesian: 0,
	lnglat: 1,
	"meter-offsets": 2,
	"lnglat-offsets": 3
};
function getShaderCoordinateSystem(coordinateSystem) {
	const shaderCoordinateSystem = COORDINATE_SYSTEM_NUMBERS[coordinateSystem];
	if (shaderCoordinateSystem === void 0) throw new Error(`Invalid coordinateSystem: ${coordinateSystem}`);
	return shaderCoordinateSystem;
}
var getMemoizedViewportUniforms = memoize(calculateViewportUniforms);
function getOffsetOrigin(viewport, coordinateSystem, coordinateOrigin = DEFAULT_COORDINATE_ORIGIN) {
	if (coordinateOrigin.length < 3) coordinateOrigin = [
		coordinateOrigin[0],
		coordinateOrigin[1],
		0
	];
	let shaderCoordinateOrigin = coordinateOrigin;
	let geospatialOrigin;
	let offsetMode = true;
	if (coordinateSystem === "lnglat-offsets" || coordinateSystem === "meter-offsets") geospatialOrigin = coordinateOrigin;
	else geospatialOrigin = viewport.isGeospatial ? [
		Math.fround(viewport.longitude),
		Math.fround(viewport.latitude),
		0
	] : null;
	switch (viewport.projectionMode) {
		case PROJECTION_MODE.WEB_MERCATOR:
			if (coordinateSystem === "lnglat" || coordinateSystem === "cartesian") {
				geospatialOrigin = [
					0,
					0,
					0
				];
				offsetMode = false;
			}
			break;
		case PROJECTION_MODE.WEB_MERCATOR_AUTO_OFFSET:
			if (coordinateSystem === "lnglat") shaderCoordinateOrigin = geospatialOrigin;
			else if (coordinateSystem === "cartesian") {
				shaderCoordinateOrigin = [
					Math.fround(viewport.center[0]),
					Math.fround(viewport.center[1]),
					0
				];
				geospatialOrigin = viewport.unprojectPosition(shaderCoordinateOrigin);
				shaderCoordinateOrigin[0] -= coordinateOrigin[0];
				shaderCoordinateOrigin[1] -= coordinateOrigin[1];
				shaderCoordinateOrigin[2] -= coordinateOrigin[2];
			}
			break;
		case PROJECTION_MODE.IDENTITY:
			shaderCoordinateOrigin = viewport.position.map(Math.fround);
			shaderCoordinateOrigin[2] = shaderCoordinateOrigin[2] || 0;
			break;
		case PROJECTION_MODE.GLOBE:
			offsetMode = false;
			geospatialOrigin = null;
			break;
		default: offsetMode = false;
	}
	return {
		geospatialOrigin,
		shaderCoordinateOrigin,
		offsetMode
	};
}
function calculateMatrixAndOffset(viewport, coordinateSystem, coordinateOrigin) {
	const { viewMatrixUncentered, projectionMatrix } = viewport;
	let { viewMatrix, viewProjectionMatrix } = viewport;
	let projectionCenter = ZERO_VECTOR$1;
	let originCommon = ZERO_VECTOR$1;
	let cameraPosCommon = viewport.cameraPosition;
	const { geospatialOrigin, shaderCoordinateOrigin, offsetMode } = getOffsetOrigin(viewport, coordinateSystem, coordinateOrigin);
	if (offsetMode) {
		originCommon = viewport.projectPosition(geospatialOrigin || shaderCoordinateOrigin);
		cameraPosCommon = [
			cameraPosCommon[0] - originCommon[0],
			cameraPosCommon[1] - originCommon[1],
			cameraPosCommon[2] - originCommon[2]
		];
		originCommon[3] = 1;
		projectionCenter = transformMat4([], originCommon, viewProjectionMatrix);
		viewMatrix = viewMatrixUncentered || viewMatrix;
		viewProjectionMatrix = multiply([], projectionMatrix, viewMatrix);
		viewProjectionMatrix = multiply([], viewProjectionMatrix, VECTOR_TO_POINT_MATRIX);
	}
	return {
		viewMatrix,
		viewProjectionMatrix,
		projectionCenter,
		originCommon,
		cameraPosCommon,
		shaderCoordinateOrigin,
		geospatialOrigin
	};
}
/**
* Returns uniforms for shaders based on current projection
* includes: projection matrix suitable for shaders
*
* TODO - Ensure this works with any viewport, not just WebMercatorViewports
*
* @param {WebMercatorViewport} viewport -
* @return {Float32Array} - 4x4 projection matrix that can be used in shaders
*/
function getUniformsFromViewport({ viewport, devicePixelRatio = 1, modelMatrix = null, coordinateSystem = "default", coordinateOrigin = DEFAULT_COORDINATE_ORIGIN, autoWrapLongitude = false }) {
	if (coordinateSystem === "default") coordinateSystem = viewport.isGeospatial ? "lnglat" : "cartesian";
	const uniforms = getMemoizedViewportUniforms({
		viewport,
		devicePixelRatio,
		coordinateSystem,
		coordinateOrigin
	});
	uniforms.wrapLongitude = autoWrapLongitude;
	uniforms.modelMatrix = modelMatrix || IDENTITY_MATRIX;
	return uniforms;
}
function calculateViewportUniforms({ viewport, devicePixelRatio, coordinateSystem, coordinateOrigin }) {
	const { projectionCenter, viewProjectionMatrix, originCommon, cameraPosCommon, shaderCoordinateOrigin, geospatialOrigin } = calculateMatrixAndOffset(viewport, coordinateSystem, coordinateOrigin);
	const distanceScales = viewport.getDistanceScales();
	const viewportSize = [viewport.width * devicePixelRatio, viewport.height * devicePixelRatio];
	const focalDistance = transformMat4([], [
		0,
		0,
		-viewport.focalDistance,
		1
	], viewport.projectionMatrix)[3] || 1;
	const uniforms = {
		coordinateSystem: getShaderCoordinateSystem(coordinateSystem),
		projectionMode: viewport.projectionMode,
		coordinateOrigin: shaderCoordinateOrigin,
		commonOrigin: originCommon.slice(0, 3),
		center: projectionCenter,
		pseudoMeters: Boolean(viewport._pseudoMeters),
		viewportSize,
		devicePixelRatio,
		focalDistance,
		commonUnitsPerMeter: distanceScales.unitsPerMeter,
		commonUnitsPerWorldUnit: distanceScales.unitsPerMeter,
		commonUnitsPerWorldUnit2: DEFAULT_PIXELS_PER_UNIT2,
		scale: viewport.scale,
		wrapLongitude: false,
		viewProjectionMatrix,
		modelMatrix: IDENTITY_MATRIX,
		cameraPosition: cameraPosCommon
	};
	if (geospatialOrigin) {
		const distanceScalesAtOrigin = viewport.getDistanceScales(geospatialOrigin);
		switch (coordinateSystem) {
			case "meter-offsets":
				uniforms.commonUnitsPerWorldUnit = distanceScalesAtOrigin.unitsPerMeter;
				uniforms.commonUnitsPerWorldUnit2 = distanceScalesAtOrigin.unitsPerMeter2;
				break;
			case "lnglat":
			case "lnglat-offsets":
				if (!viewport._pseudoMeters) uniforms.commonUnitsPerMeter = distanceScalesAtOrigin.unitsPerMeter;
				uniforms.commonUnitsPerWorldUnit = distanceScalesAtOrigin.unitsPerDegree;
				uniforms.commonUnitsPerWorldUnit2 = distanceScalesAtOrigin.unitsPerDegree2;
				break;
			case "cartesian":
				uniforms.commonUnitsPerWorldUnit = [
					1,
					1,
					distanceScalesAtOrigin.unitsPerMeter[2]
				];
				uniforms.commonUnitsPerWorldUnit2 = [
					0,
					0,
					distanceScalesAtOrigin.unitsPerMeter2[2]
				];
				break;
			default: break;
		}
	}
	return uniforms;
}
var projectWGSL = `\
${`\
${[
	"default",
	"lnglat",
	"meter-offsets",
	"lnglat-offsets",
	"cartesian"
].map((coordinateSystem) => `const COORDINATE_SYSTEM_${coordinateSystem.toUpperCase().replaceAll("-", "_")}: i32 = ${getShaderCoordinateSystem(coordinateSystem)};`).join("")}
${Object.keys(PROJECTION_MODE).map((key) => `const PROJECTION_MODE_${key}: i32 = ${PROJECTION_MODE[key]};`).join("")}
${Object.keys(UNIT).map((key) => `const UNIT_${key.toUpperCase()}: i32 = ${UNIT[key]};`).join("")}

const TILE_SIZE: f32 = 512.0;
const PI: f32 = 3.1415926536;
const WORLD_SCALE: f32 = TILE_SIZE / (PI * 2.0);
const ZERO_64_LOW: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
const EARTH_RADIUS: f32 = 6370972.0; // meters
const GLOBE_RADIUS: f32 = 256.0;

// -----------------------------------------------------------------------------
// Uniform block (converted from GLSL uniform block)
// -----------------------------------------------------------------------------
struct ProjectUniforms {
  wrapLongitude: i32,
  coordinateSystem: i32,
  commonUnitsPerMeter: vec3<f32>,
  projectionMode: i32,
  scale: f32,
  commonUnitsPerWorldUnit: vec3<f32>,
  commonUnitsPerWorldUnit2: vec3<f32>,
  center: vec4<f32>,
  modelMatrix: mat4x4<f32>,
  viewProjectionMatrix: mat4x4<f32>,
  viewportSize: vec2<f32>,
  devicePixelRatio: f32,
  focalDistance: f32,
  cameraPosition: vec3<f32>,
  coordinateOrigin: vec3<f32>,
  commonOrigin: vec3<f32>,
  pseudoMeters: i32,
};

@group(0) @binding(auto)
var<uniform> project: ProjectUniforms;

// -----------------------------------------------------------------------------
// Geometry data shared across the project helpers.
// The active layer shader is responsible for populating this private module
// state before calling the project functions below.
// -----------------------------------------------------------------------------

// Structure to carry additional geometry data used by deck.gl filters.
struct Geometry {
  worldPosition: vec3<f32>,
  worldPositionAlt: vec3<f32>,
  position: vec4<f32>,
  normal: vec3<f32>,
  uv: vec2<f32>,
  pickingColor: vec3<f32>,
};

var<private> geometry: Geometry;
`}

// -----------------------------------------------------------------------------
// Functions
// -----------------------------------------------------------------------------

// Returns an adjustment factor for commonUnitsPerMeter
fn _project_size_at_latitude(lat: f32) -> f32 {
  let y = clamp(lat, -89.9, 89.9);
  return 1.0 / cos(radians(y));
}

// Overloaded version: scales a value in meters at a given latitude.
fn _project_size_at_latitude_m(meters: f32, lat: f32) -> f32 {
  return meters * project.commonUnitsPerMeter.z * _project_size_at_latitude(lat);
}

// Computes a non-linear scale factor based on geometry.
// (Note: This function relies on "geometry" being provided.)
fn project_size() -> f32 {
  if (project.projectionMode == PROJECTION_MODE_WEB_MERCATOR &&
      project.coordinateSystem == COORDINATE_SYSTEM_LNGLAT &&
      project.pseudoMeters == 0) {
    if (geometry.position.w == 0.0) {
      return _project_size_at_latitude(geometry.worldPosition.y);
    }
    let y: f32 = geometry.position.y / TILE_SIZE * 2.0 - 1.0;
    let y2 = y * y;
    let y4 = y2 * y2;
    let y6 = y4 * y2;
    return 1.0 + 4.9348 * y2 + 4.0587 * y4 + 1.5642 * y6;
  }
  return 1.0;
}

// Overloads to scale offsets (meters to world units)
fn project_size_float(meters: f32) -> f32 {
  return meters * project.commonUnitsPerMeter.z * project_size();
}

fn project_size_vec2(meters: vec2<f32>) -> vec2<f32> {
  return meters * project.commonUnitsPerMeter.xy * project_size();
}

fn project_size_vec3(meters: vec3<f32>) -> vec3<f32> {
  return meters * project.commonUnitsPerMeter * project_size();
}

fn project_size_vec4(meters: vec4<f32>) -> vec4<f32> {
  return vec4<f32>(meters.xyz * project.commonUnitsPerMeter, meters.w);
}

// Returns a rotation matrix aligning the z‑axis with the given up vector.
fn project_get_orientation_matrix(up: vec3<f32>) -> mat3x3<f32> {
  let uz = normalize(up);
  let ux = select(
    vec3<f32>(1.0, 0.0, 0.0),
    normalize(vec3<f32>(uz.y, -uz.x, 0.0)),
    abs(uz.z) == 1.0
  );
  let uy = cross(uz, ux);
  return mat3x3<f32>(ux, uy, uz);
}

// Since WGSL does not support "out" parameters, we return a struct.
struct RotationResult {
  needsRotation: bool,
  transform: mat3x3<f32>,
};

fn project_needs_rotation(commonPosition: vec3<f32>) -> RotationResult {
  if (project.projectionMode == PROJECTION_MODE_GLOBE) {
    return RotationResult(true, project_get_orientation_matrix(commonPosition));
  } else {
    return RotationResult(false, mat3x3<f32>());  // identity alternative if needed
  };
}

// Projects a normal vector from the current coordinate system to world space.
fn project_normal(vector: vec3<f32>) -> vec3<f32> {
  let normal_modelspace = project.modelMatrix * vec4<f32>(vector, 0.0);
  var n = normalize(normal_modelspace.xyz * project.commonUnitsPerMeter);
  let rotResult = project_needs_rotation(geometry.position.xyz);
  if (rotResult.needsRotation) {
    n = rotResult.transform * n;
  }
  return n;
}

// Applies a scale offset based on y-offset (dy)
fn project_offset_(offset: vec4<f32>) -> vec4<f32> {
  let dy: f32 = offset.y;
  let commonUnitsPerWorldUnit = project.commonUnitsPerWorldUnit + project.commonUnitsPerWorldUnit2 * dy;
  return vec4<f32>(offset.xyz * commonUnitsPerWorldUnit, offset.w);
}

// Projects lng/lat coordinates to a unit tile [0,1]
fn project_mercator_(lnglat: vec2<f32>) -> vec2<f32> {
  var x = lnglat.x;
  if (project.wrapLongitude != 0) {
    x = ((x + 180.0) % 360.0) - 180.0;
  }
  let y = clamp(lnglat.y, -89.9, 89.9);
  return vec2<f32>(
    radians(x) + PI,
    PI + log(tan(PI * 0.25 + radians(y) * 0.5))
  ) * WORLD_SCALE;
}

// Projects lng/lat/z coordinates for a globe projection.
fn project_globe_(lnglatz: vec3<f32>) -> vec3<f32> {
  let lambda = radians(lnglatz.x);
  let phi = radians(lnglatz.y);
  let cosPhi = cos(phi);
  let D = (lnglatz.z / EARTH_RADIUS + 1.0) * GLOBE_RADIUS;
  return vec3<f32>(
    sin(lambda) * cosPhi,
    -cos(lambda) * cosPhi,
    sin(phi)
  ) * D;
}

// Projects positions (with an optional 64-bit low part) from the input
// coordinate system to the common space.
fn project_position_vec4_f64(position: vec4<f32>, position64Low: vec3<f32>) -> vec4<f32> {
  var position_world = project.modelMatrix * position;

  // Work around for a Mac+NVIDIA bug:
  if (project.projectionMode == PROJECTION_MODE_WEB_MERCATOR) {
    if (project.coordinateSystem == COORDINATE_SYSTEM_LNGLAT) {
      return vec4<f32>(
        project_mercator_(position_world.xy),
        _project_size_at_latitude_m(position_world.z, position_world.y),
        position_world.w
      );
    }
    if (project.coordinateSystem == COORDINATE_SYSTEM_CARTESIAN) {
      position_world = vec4f(position_world.xyz + project.coordinateOrigin, position_world.w);
    }
  }
  if (project.projectionMode == PROJECTION_MODE_GLOBE) {
    if (project.coordinateSystem == COORDINATE_SYSTEM_LNGLAT) {
      return vec4<f32>(
        project_globe_(position_world.xyz),
        position_world.w
      );
    }
  }
  if (project.projectionMode == PROJECTION_MODE_WEB_MERCATOR_AUTO_OFFSET) {
    if (project.coordinateSystem == COORDINATE_SYSTEM_LNGLAT) {
      if (abs(position_world.y - project.coordinateOrigin.y) > 0.25) {
        return vec4<f32>(
          project_mercator_(position_world.xy) - project.commonOrigin.xy,
          project_size_float(position_world.z),
          position_world.w
        );
      }
    }
  }
  if (project.projectionMode == PROJECTION_MODE_IDENTITY ||
      (project.projectionMode == PROJECTION_MODE_WEB_MERCATOR_AUTO_OFFSET &&
       (project.coordinateSystem == COORDINATE_SYSTEM_LNGLAT ||
        project.coordinateSystem == COORDINATE_SYSTEM_CARTESIAN))) {
    position_world = vec4f(position_world.xyz - project.coordinateOrigin, position_world.w);
  }

  return project_offset_(position_world) +
         project_offset_(project.modelMatrix * vec4<f32>(position64Low, 0.0));
}

// Overloaded versions for different input types.
fn project_position_vec4_f32(position: vec4<f32>) -> vec4<f32> {
  return project_position_vec4_f64(position, ZERO_64_LOW);
}

fn project_position_vec3_f64(position: vec3<f32>, position64Low: vec3<f32>) -> vec3<f32> {
  let projected_position = project_position_vec4_f64(vec4<f32>(position, 1.0), position64Low);
  return projected_position.xyz;
}

fn project_position_vec3_f32(position: vec3<f32>) -> vec3<f32> {
  let projected_position = project_position_vec4_f64(vec4<f32>(position, 1.0), ZERO_64_LOW);
  return projected_position.xyz;
}

fn project_position_vec2_f32(position: vec2<f32>) -> vec2<f32> {
  let projected_position = project_position_vec4_f64(vec4<f32>(position, 0.0, 1.0), ZERO_64_LOW);
  return projected_position.xy;
}

// Transforms a common space position to clip space.
fn project_common_position_to_clipspace_with_projection(position: vec4<f32>, viewProjectionMatrix: mat4x4<f32>, center: vec4<f32>) -> vec4<f32> {
  return viewProjectionMatrix * position + center;
}

// Uses the project viewProjectionMatrix and center.
fn project_common_position_to_clipspace(position: vec4<f32>) -> vec4<f32> {
  return project_common_position_to_clipspace_with_projection(position, project.viewProjectionMatrix, project.center);
}

// Returns a clip space offset corresponding to a given number of screen pixels.
fn project_pixel_size_to_clipspace(pixels: vec2<f32>) -> vec2<f32> {
  let offset = pixels / project.viewportSize * project.devicePixelRatio * 2.0;
  return offset * project.focalDistance;
}

fn project_meter_size_to_pixel(meters: f32) -> f32 {
  return project_size_float(meters) * project.scale;
}

fn project_unit_size_to_pixel(size: f32, unit: i32) -> f32 {
  if (unit == UNIT_METERS) {
    return project_meter_size_to_pixel(size);
  } else if (unit == UNIT_COMMON) {
    return size * project.scale;
  }
  // UNIT_PIXELS: no scaling applied.
  return size;
}

fn project_pixel_size_float(pixels: f32) -> f32 {
  return pixels / project.scale;
}

fn project_pixel_size_vec2(pixels: vec2<f32>) -> vec2<f32> {
  return pixels / project.scale;
}
`;
var projectGLSL = `\
${[
	"default",
	"lnglat",
	"meter-offsets",
	"lnglat-offsets",
	"cartesian"
].map((coordinateSystem) => `const int COORDINATE_SYSTEM_${coordinateSystem.toUpperCase().replaceAll("-", "_")} = ${getShaderCoordinateSystem(coordinateSystem)};`).join("")}
${Object.keys(PROJECTION_MODE).map((key) => `const int PROJECTION_MODE_${key} = ${PROJECTION_MODE[key]};`).join("")}
${Object.keys(UNIT).map((key) => `const int UNIT_${key.toUpperCase()} = ${UNIT[key]};`).join("")}
layout(std140) uniform projectUniforms {
bool wrapLongitude;
int coordinateSystem;
vec3 commonUnitsPerMeter;
int projectionMode;
float scale;
vec3 commonUnitsPerWorldUnit;
vec3 commonUnitsPerWorldUnit2;
vec4 center;
mat4 modelMatrix;
mat4 viewProjectionMatrix;
vec2 viewportSize;
float devicePixelRatio;
float focalDistance;
vec3 cameraPosition;
vec3 coordinateOrigin;
vec3 commonOrigin;
bool pseudoMeters;
} project;
const float TILE_SIZE = 512.0;
const float PI = 3.1415926536;
const float WORLD_SCALE = TILE_SIZE / (PI * 2.0);
const vec3 ZERO_64_LOW = vec3(0.0);
const float EARTH_RADIUS = 6370972.0;
const float GLOBE_RADIUS = 256.0;
float project_size_at_latitude(float lat) {
float y = clamp(lat, -89.9, 89.9);
return 1.0 / cos(radians(y));
}
float project_size() {
if (project.projectionMode == PROJECTION_MODE_WEB_MERCATOR &&
project.coordinateSystem == COORDINATE_SYSTEM_LNGLAT &&
project.pseudoMeters == false) {
if (geometry.position.w == 0.0) {
return project_size_at_latitude(geometry.worldPosition.y);
}
float y = geometry.position.y / TILE_SIZE * 2.0 - 1.0;
float y2 = y * y;
float y4 = y2 * y2;
float y6 = y4 * y2;
return 1.0 + 4.9348 * y2 + 4.0587 * y4 + 1.5642 * y6;
}
return 1.0;
}
float project_size_at_latitude(float meters, float lat) {
return meters * project.commonUnitsPerMeter.z * project_size_at_latitude(lat);
}
float project_size(float meters) {
return meters * project.commonUnitsPerMeter.z * project_size();
}
vec2 project_size(vec2 meters) {
return meters * project.commonUnitsPerMeter.xy * project_size();
}
vec3 project_size(vec3 meters) {
return meters * project.commonUnitsPerMeter * project_size();
}
vec4 project_size(vec4 meters) {
return vec4(meters.xyz * project.commonUnitsPerMeter, meters.w);
}
mat3 project_get_orientation_matrix(vec3 up) {
vec3 uz = normalize(up);
vec3 ux = abs(uz.z) == 1.0 ? vec3(1.0, 0.0, 0.0) : normalize(vec3(uz.y, -uz.x, 0));
vec3 uy = cross(uz, ux);
return mat3(ux, uy, uz);
}
bool project_needs_rotation(vec3 commonPosition, out mat3 transform) {
if (project.projectionMode == PROJECTION_MODE_GLOBE) {
transform = project_get_orientation_matrix(commonPosition);
return true;
}
return false;
}
vec3 project_normal(vec3 vector) {
vec4 normal_modelspace = project.modelMatrix * vec4(vector, 0.0);
vec3 n = normalize(normal_modelspace.xyz * project.commonUnitsPerMeter);
mat3 rotation;
if (project_needs_rotation(geometry.position.xyz, rotation)) {
n = rotation * n;
}
return n;
}
vec4 project_offset_(vec4 offset) {
float dy = offset.y;
vec3 commonUnitsPerWorldUnit = project.commonUnitsPerWorldUnit + project.commonUnitsPerWorldUnit2 * dy;
return vec4(offset.xyz * commonUnitsPerWorldUnit, offset.w);
}
vec2 project_mercator_(vec2 lnglat) {
float x = lnglat.x;
if (project.wrapLongitude) {
x = mod(x + 180., 360.0) - 180.;
}
float y = clamp(lnglat.y, -89.9, 89.9);
return vec2(
radians(x) + PI,
PI + log(tan_fp32(PI * 0.25 + radians(y) * 0.5))
) * WORLD_SCALE;
}
vec3 project_globe_(vec3 lnglatz) {
float lambda = radians(lnglatz.x);
float phi = radians(lnglatz.y);
float cosPhi = cos(phi);
float D = (lnglatz.z / EARTH_RADIUS + 1.0) * GLOBE_RADIUS;
return vec3(
sin(lambda) * cosPhi,
-cos(lambda) * cosPhi,
sin(phi)
) * D;
}
vec4 project_position(vec4 position, vec3 position64Low) {
vec4 position_world = project.modelMatrix * position;
if (project.projectionMode == PROJECTION_MODE_WEB_MERCATOR) {
if (project.coordinateSystem == COORDINATE_SYSTEM_LNGLAT) {
return vec4(
project_mercator_(position_world.xy),
project_size_at_latitude(position_world.z, position_world.y),
position_world.w
);
}
if (project.coordinateSystem == COORDINATE_SYSTEM_CARTESIAN) {
position_world.xyz += project.coordinateOrigin;
}
}
if (project.projectionMode == PROJECTION_MODE_GLOBE) {
if (project.coordinateSystem == COORDINATE_SYSTEM_LNGLAT) {
return vec4(
project_globe_(position_world.xyz),
position_world.w
);
}
}
if (project.projectionMode == PROJECTION_MODE_WEB_MERCATOR_AUTO_OFFSET) {
if (project.coordinateSystem == COORDINATE_SYSTEM_LNGLAT) {
if (abs(position_world.y - project.coordinateOrigin.y) > 0.25) {
return vec4(
project_mercator_(position_world.xy) - project.commonOrigin.xy,
project_size(position_world.z),
position_world.w
);
}
}
}
if (project.projectionMode == PROJECTION_MODE_IDENTITY ||
(project.projectionMode == PROJECTION_MODE_WEB_MERCATOR_AUTO_OFFSET &&
(project.coordinateSystem == COORDINATE_SYSTEM_LNGLAT ||
project.coordinateSystem == COORDINATE_SYSTEM_CARTESIAN))) {
position_world.xyz -= project.coordinateOrigin;
}
return project_offset_(position_world) + project_offset_(project.modelMatrix * vec4(position64Low, 0.0));
}
vec4 project_position(vec4 position) {
return project_position(position, ZERO_64_LOW);
}
vec3 project_position(vec3 position, vec3 position64Low) {
vec4 projected_position = project_position(vec4(position, 1.0), position64Low);
return projected_position.xyz;
}
vec3 project_position(vec3 position) {
vec4 projected_position = project_position(vec4(position, 1.0), ZERO_64_LOW);
return projected_position.xyz;
}
vec2 project_position(vec2 position) {
vec4 projected_position = project_position(vec4(position, 0.0, 1.0), ZERO_64_LOW);
return projected_position.xy;
}
vec4 project_common_position_to_clipspace(vec4 position, mat4 viewProjectionMatrix, vec4 center) {
return viewProjectionMatrix * position + center;
}
vec4 project_common_position_to_clipspace(vec4 position) {
return project_common_position_to_clipspace(position, project.viewProjectionMatrix, project.center);
}
vec2 project_pixel_size_to_clipspace(vec2 pixels) {
vec2 offset = pixels / project.viewportSize * project.devicePixelRatio * 2.0;
return offset * project.focalDistance;
}
float project_size_to_pixel(float meters) {
return project_size(meters) * project.scale;
}
vec2 project_size_to_pixel(vec2 meters) {
return project_size(meters) * project.scale;
}
float project_size_to_pixel(float size, int unit) {
if (unit == UNIT_METERS) return project_size_to_pixel(size);
if (unit == UNIT_COMMON) return size * project.scale;
return size;
}
float project_pixel_size(float pixels) {
return pixels / project.scale;
}
vec2 project_pixel_size(vec2 pixels) {
return pixels / project.scale;
}
`;
//#endregion
//#region node_modules/@deck.gl/core/dist/shaderlib/project/project.js
var INITIAL_MODULE_OPTIONS = {};
function getUniforms(opts = INITIAL_MODULE_OPTIONS) {
	if ("viewport" in opts) return getUniformsFromViewport(opts);
	return {};
}
var project_default = {
	name: "project",
	dependencies: [fp32, geometry_default],
	source: projectWGSL,
	vs: projectGLSL,
	getUniforms,
	uniformTypes: {
		wrapLongitude: "f32",
		coordinateSystem: "i32",
		commonUnitsPerMeter: "vec3<f32>",
		projectionMode: "i32",
		scale: "f32",
		commonUnitsPerWorldUnit: "vec3<f32>",
		commonUnitsPerWorldUnit2: "vec3<f32>",
		center: "vec4<f32>",
		modelMatrix: "mat4x4<f32>",
		viewProjectionMatrix: "mat4x4<f32>",
		viewportSize: "vec2<f32>",
		devicePixelRatio: "f32",
		focalDistance: "f32",
		cameraPosition: "vec3<f32>",
		coordinateOrigin: "vec3<f32>",
		commonOrigin: "vec3<f32>",
		pseudoMeters: "f32"
	}
};
//#endregion
//#region node_modules/@math.gl/web-mercator/dist/math-utils.js
function createMat4$1() {
	return [
		1,
		0,
		0,
		0,
		0,
		1,
		0,
		0,
		0,
		0,
		1,
		0,
		0,
		0,
		0,
		1
	];
}
function transformVector(matrix, vector) {
	const result = transformMat4([], vector, matrix);
	scale(result, result, 1 / result[3]);
	return result;
}
function lerp(start, end, step) {
	return step * end + (1 - step) * start;
}
function clamp(x, min, max) {
	return x < min ? min : x > max ? max : x;
}
function ieLog2(x) {
	return Math.log(x) * Math.LOG2E;
}
var log2 = Math.log2 || ieLog2;
//#endregion
//#region node_modules/@math.gl/web-mercator/dist/assert.js
function assert(condition, message) {
	if (!condition) throw new Error(message || "@math.gl/web-mercator: assertion failed.");
}
//#endregion
//#region node_modules/@math.gl/web-mercator/dist/web-mercator-utils.js
var PI = Math.PI;
var PI_4 = PI / 4;
var DEGREES_TO_RADIANS$2 = PI / 180;
var RADIANS_TO_DEGREES = 180 / PI;
var TILE_SIZE = 512;
var EARTH_CIRCUMFERENCE = 4003e4;
var MAX_LATITUDE = 85.051129;
var DEFAULT_ALTITUDE = 1.5;
/** Logarithimic zoom to linear scale **/
function zoomToScale(zoom) {
	return Math.pow(2, zoom);
}
/** Linear scale to logarithimic zoom **/
function scaleToZoom(scale) {
	return log2(scale);
}
/**
* Project [lng,lat] on sphere onto [x,y] on 512*512 Mercator Zoom 0 tile.
* Performs the nonlinear part of the web mercator projection.
* Remaining projection is done with 4x4 matrices which also handles
* perspective.
*
* @param lngLat - [lng, lat] coordinates
*   Specifies a point on the sphere to project onto the map.
* @return [x,y] coordinates.
*/
function lngLatToWorld(lngLat) {
	const [lng, lat] = lngLat;
	assert(Number.isFinite(lng));
	assert(Number.isFinite(lat) && lat >= -90 && lat <= 90, "invalid latitude");
	const lambda2 = lng * DEGREES_TO_RADIANS$2;
	const phi2 = lat * DEGREES_TO_RADIANS$2;
	return [TILE_SIZE * (lambda2 + PI) / (2 * PI), TILE_SIZE * (PI + Math.log(Math.tan(PI_4 + phi2 * .5))) / (2 * PI)];
}
/**
* Unproject world point [x,y] on map onto {lat, lon} on sphere
*
* @param xy - array with [x,y] members
*  representing point on projected map plane
* @return - array with [x,y] of point on sphere.
*   Has toArray method if you need a GeoJSON Array.
*   Per cartographic tradition, lat and lon are specified as degrees.
*/
function worldToLngLat(xy) {
	const [x, y] = xy;
	const lambda2 = x / TILE_SIZE * (2 * PI) - PI;
	const phi2 = 2 * (Math.atan(Math.exp(y / TILE_SIZE * (2 * PI) - PI)) - PI_4);
	return [lambda2 * RADIANS_TO_DEGREES, phi2 * RADIANS_TO_DEGREES];
}
/**
* Returns the zoom level that gives a 1 meter pixel at a certain latitude
* 1 = C*cos(y)/2^z/TILE_SIZE = C*cos(y)/2^(z+9)
*/
function getMeterZoom(options) {
	const { latitude } = options;
	assert(Number.isFinite(latitude));
	return scaleToZoom(EARTH_CIRCUMFERENCE * Math.cos(latitude * DEGREES_TO_RADIANS$2)) - 9;
}
/**
* Calculate the conversion from meter to common units at a given latitude
* This is a cheaper version of `getDistanceScales`
* @param latitude center latitude in degrees
* @returns common units per meter
*/
function unitsPerMeter(latitude) {
	const latCosine = Math.cos(latitude * DEGREES_TO_RADIANS$2);
	return TILE_SIZE / EARTH_CIRCUMFERENCE / latCosine;
}
/**
* Calculate distance scales in meters around current lat/lon, both for
* degrees and pixels.
* In mercator projection mode, the distance scales vary significantly
* with latitude.
*/
function getDistanceScales(options) {
	const { latitude, longitude, highPrecision = false } = options;
	assert(Number.isFinite(latitude) && Number.isFinite(longitude));
	const worldSize = TILE_SIZE;
	const latCosine = Math.cos(latitude * DEGREES_TO_RADIANS$2);
	/**
	* Number of pixels occupied by one degree longitude around current lat/lon:
	unitsPerDegreeX = d(lngLatToWorld([lng, lat])[0])/d(lng)
	= scale * TILE_SIZE * DEGREES_TO_RADIANS / (2 * PI)
	unitsPerDegreeY = d(lngLatToWorld([lng, lat])[1])/d(lat)
	= -scale * TILE_SIZE * DEGREES_TO_RADIANS / cos(lat * DEGREES_TO_RADIANS)  / (2 * PI)
	*/
	const unitsPerDegreeX = worldSize / 360;
	const unitsPerDegreeY = unitsPerDegreeX / latCosine;
	/**
	* Number of pixels occupied by one meter around current lat/lon:
	*/
	const altUnitsPerMeter = worldSize / EARTH_CIRCUMFERENCE / latCosine;
	/**
	* LngLat: longitude -> east and latitude -> north (bottom left)
	* UTM meter offset: x -> east and y -> north (bottom left)
	* World space: x -> east and y -> south (top left)
	*
	* Y needs to be flipped when converting delta degree/meter to delta pixels
	*/
	const result = {
		unitsPerMeter: [
			altUnitsPerMeter,
			altUnitsPerMeter,
			altUnitsPerMeter
		],
		metersPerUnit: [
			1 / altUnitsPerMeter,
			1 / altUnitsPerMeter,
			1 / altUnitsPerMeter
		],
		unitsPerDegree: [
			unitsPerDegreeX,
			unitsPerDegreeY,
			altUnitsPerMeter
		],
		degreesPerUnit: [
			1 / unitsPerDegreeX,
			1 / unitsPerDegreeY,
			1 / altUnitsPerMeter
		]
	};
	/**
	* Taylor series 2nd order for 1/latCosine
	f'(a) * (x - a)
	= d(1/cos(lat * DEGREES_TO_RADIANS))/d(lat) * dLat
	= DEGREES_TO_RADIANS * tan(lat * DEGREES_TO_RADIANS) / cos(lat * DEGREES_TO_RADIANS) * dLat
	*/
	if (highPrecision) {
		const latCosine2 = DEGREES_TO_RADIANS$2 * Math.tan(latitude * DEGREES_TO_RADIANS$2) / latCosine;
		const unitsPerDegreeY2 = unitsPerDegreeX * latCosine2 / 2;
		const altUnitsPerDegree2 = worldSize / EARTH_CIRCUMFERENCE * latCosine2;
		const altUnitsPerMeter2 = altUnitsPerDegree2 / unitsPerDegreeY * altUnitsPerMeter;
		result.unitsPerDegree2 = [
			0,
			unitsPerDegreeY2,
			altUnitsPerDegree2
		];
		result.unitsPerMeter2 = [
			altUnitsPerMeter2,
			0,
			altUnitsPerMeter2
		];
	}
	return result;
}
/**
* Offset a lng/lat position by meterOffset (northing, easting)
*/
function addMetersToLngLat(lngLatZ, xyz) {
	const [longitude, latitude, z0] = lngLatZ;
	const [x, y, z] = xyz;
	const { unitsPerMeter, unitsPerMeter2 } = getDistanceScales({
		longitude,
		latitude,
		highPrecision: true
	});
	const worldspace = lngLatToWorld(lngLatZ);
	worldspace[0] += x * (unitsPerMeter[0] + unitsPerMeter2[0] * y);
	worldspace[1] += y * (unitsPerMeter[1] + unitsPerMeter2[1] * y);
	const newLngLat = worldToLngLat(worldspace);
	const newZ = (z0 || 0) + (z || 0);
	return Number.isFinite(z0) || Number.isFinite(z) ? [
		newLngLat[0],
		newLngLat[1],
		newZ
	] : newLngLat;
}
/**
*
* view and projection matrix creation is intentionally kept compatible with
* mapbox-gl's implementation to ensure that seamless interoperation
* with mapbox and react-map-gl. See: https://github.com/mapbox/mapbox-gl-js
*/
function getViewMatrix(options) {
	const { height, pitch, bearing, altitude, scale, center } = options;
	const vm = createMat4$1();
	translate(vm, vm, [
		0,
		0,
		-altitude
	]);
	rotateX(vm, vm, -pitch * DEGREES_TO_RADIANS$2);
	rotateZ(vm, vm, bearing * DEGREES_TO_RADIANS$2);
	const relativeScale = scale / height;
	scale$1(vm, vm, [
		relativeScale,
		relativeScale,
		relativeScale
	]);
	if (center) translate(vm, vm, negate([], center));
	return vm;
}
/**
* Calculates mapbox compatible projection matrix from parameters
*
* @param options.width Width of "viewport" or window
* @param options.height Height of "viewport" or window
* @param options.scale Scale at the current zoom
* @param options.center Offset of the target, vec3 in world space
* @param options.offset Offset of the focal point, vec2 in screen space
* @param options.pitch Camera angle in degrees (0 is straight down)
* @param options.fovy field of view in degrees
* @param options.altitude if provided, field of view is calculated using `altitudeToFovy()`
* @param options.nearZMultiplier control z buffer
* @param options.farZMultiplier control z buffer
* @returns project parameters object
*/
function getProjectionParameters(options) {
	const { width, height, altitude, pitch = 0, offset, center, scale, nearZMultiplier = 1, farZMultiplier = 1 } = options;
	let { fovy = altitudeToFovy(DEFAULT_ALTITUDE) } = options;
	if (altitude !== void 0) fovy = altitudeToFovy(altitude);
	const fovRadians = fovy * DEGREES_TO_RADIANS$2;
	const pitchRadians = pitch * DEGREES_TO_RADIANS$2;
	const focalDistance = fovyToAltitude(fovy);
	let cameraToSeaLevelDistance = focalDistance;
	if (center) cameraToSeaLevelDistance += center[2] * scale / Math.cos(pitchRadians) / height;
	const fovAboveCenter = fovRadians * (.5 + (offset ? offset[1] : 0) / height);
	const topHalfSurfaceDistance = Math.sin(fovAboveCenter) * cameraToSeaLevelDistance / Math.sin(clamp(Math.PI / 2 - pitchRadians - fovAboveCenter, .01, Math.PI - .01));
	const furthestDistance = Math.sin(pitchRadians) * topHalfSurfaceDistance + cameraToSeaLevelDistance;
	const horizonDistance = cameraToSeaLevelDistance * 10;
	const farZ = Math.min(furthestDistance * farZMultiplier, horizonDistance);
	return {
		fov: fovRadians,
		aspect: width / height,
		focalDistance,
		near: nearZMultiplier,
		far: farZ
	};
}
/**
*
* Convert an altitude to field of view such that the
* focal distance is equal to the altitude
*
* @param altitude - altitude of camera in screen units
* @return fovy field of view in degrees
*/
function altitudeToFovy(altitude) {
	return 2 * Math.atan(.5 / altitude) * RADIANS_TO_DEGREES;
}
/**
*
* Convert an field of view such that the
* focal distance is equal to the altitude
*
* @param fovy - field of view in degrees
* @return altitude altitude of camera in screen units
*/
function fovyToAltitude(fovy) {
	return .5 / Math.tan(.5 * fovy * DEGREES_TO_RADIANS$2);
}
function worldToPixels(xyz, pixelProjectionMatrix) {
	const [x, y, z = 0] = xyz;
	assert(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z));
	return transformVector(pixelProjectionMatrix, [
		x,
		y,
		z,
		1
	]);
}
/**
* Unproject pixels on screen to flat coordinates.
*
* @param xyz - pixel coordinate on screen.
* @param pixelUnprojectionMatrix - unprojection matrix 4x4
* @param targetZ - if pixel coordinate does not have a 3rd component (depth),
*    targetZ is used as the elevation plane to unproject onto
* @return [x, y, Z] flat coordinates on 512*512 Mercator Zoom 0 tile.
*/
function pixelsToWorld(xyz, pixelUnprojectionMatrix, targetZ = 0) {
	const [x, y, z] = xyz;
	assert(Number.isFinite(x) && Number.isFinite(y), "invalid pixel coordinate");
	if (Number.isFinite(z)) return transformVector(pixelUnprojectionMatrix, [
		x,
		y,
		z,
		1
	]);
	const coord0 = transformVector(pixelUnprojectionMatrix, [
		x,
		y,
		0,
		1
	]);
	const coord1 = transformVector(pixelUnprojectionMatrix, [
		x,
		y,
		1,
		1
	]);
	const z0 = coord0[2];
	const z1 = coord1[2];
	return lerp$2([], coord0, coord1, z0 === z1 ? 0 : ((targetZ || 0) - z0) / (z1 - z0));
}
//#endregion
//#region node_modules/@math.gl/web-mercator/dist/fit-bounds.js
/**
* Returns map settings {latitude, longitude, zoom}
* that will contain the provided corners within the provided width.
*
* > _Note: Only supports non-perspective mode._
*
* @param options fit bounds parameters
* @returns - latitude, longitude and zoom
*/
function fitBounds(options) {
	const { width, height, bounds, minExtent = 0, maxZoom = 24, offset = [0, 0] } = options;
	const [[west, south], [east, north]] = bounds;
	const padding = getPaddingObject(options.padding);
	const nw = lngLatToWorld([west, clamp(north, -MAX_LATITUDE, MAX_LATITUDE)]);
	const se = lngLatToWorld([east, clamp(south, -MAX_LATITUDE, MAX_LATITUDE)]);
	const size = [Math.max(Math.abs(se[0] - nw[0]), minExtent), Math.max(Math.abs(se[1] - nw[1]), minExtent)];
	const targetSize = [width - padding.left - padding.right - Math.abs(offset[0]) * 2, height - padding.top - padding.bottom - Math.abs(offset[1]) * 2];
	assert(targetSize[0] > 0 && targetSize[1] > 0);
	const scaleX = targetSize[0] / size[0];
	const scaleY = targetSize[1] / size[1];
	const offsetX = (padding.right - padding.left) / 2 / scaleX;
	const offsetY = (padding.top - padding.bottom) / 2 / scaleY;
	const centerLngLat = worldToLngLat([(se[0] + nw[0]) / 2 + offsetX, (se[1] + nw[1]) / 2 + offsetY]);
	const zoom = Math.min(maxZoom, log2(Math.abs(Math.min(scaleX, scaleY))));
	assert(Number.isFinite(zoom));
	return {
		longitude: centerLngLat[0],
		latitude: centerLngLat[1],
		zoom
	};
}
function getPaddingObject(padding = 0) {
	if (typeof padding === "number") return {
		top: padding,
		bottom: padding,
		left: padding,
		right: padding
	};
	assert(Number.isFinite(padding.top) && Number.isFinite(padding.bottom) && Number.isFinite(padding.left) && Number.isFinite(padding.right));
	return padding;
}
//#endregion
//#region node_modules/@math.gl/web-mercator/dist/get-bounds.js
var DEGREES_TO_RADIANS$1 = Math.PI / 180;
function getBounds(viewport, z = 0) {
	const { width, height, unproject } = viewport;
	const unprojectOps = { targetZ: z };
	const bottomLeft = unproject([0, height], unprojectOps);
	const bottomRight = unproject([width, height], unprojectOps);
	let topLeft;
	let topRight;
	if ((viewport.fovy ? .5 * viewport.fovy * DEGREES_TO_RADIANS$1 : Math.atan(.5 / viewport.altitude)) > (90 - viewport.pitch) * DEGREES_TO_RADIANS$1 - .01) {
		topLeft = unprojectOnFarPlane(viewport, 0, z);
		topRight = unprojectOnFarPlane(viewport, width, z);
	} else {
		topLeft = unproject([0, 0], unprojectOps);
		topRight = unproject([width, 0], unprojectOps);
	}
	return [
		bottomLeft,
		bottomRight,
		topRight,
		topLeft
	];
}
function unprojectOnFarPlane(viewport, x, targetZ) {
	const { pixelUnprojectionMatrix } = viewport;
	const coord0 = transformVector(pixelUnprojectionMatrix, [
		x,
		0,
		1,
		1
	]);
	const coord1 = transformVector(pixelUnprojectionMatrix, [
		x,
		viewport.height,
		1,
		1
	]);
	const result = worldToLngLat(lerp$2([], coord0, coord1, (targetZ * viewport.distanceScales.unitsPerMeter[2] - coord0[2]) / (coord1[2] - coord0[2])));
	result.push(targetZ);
	return result;
}
//#endregion
//#region node_modules/@math.gl/web-mercator/dist/fly-to-viewport.js
var EPSILON = .01;
var VIEWPORT_TRANSITION_PROPS = [
	"longitude",
	"latitude",
	"zoom"
];
var DEFAULT_OPTS = {
	curve: 1.414,
	speed: 1.2
};
/**
* mapbox-gl-js flyTo : https://www.mapbox.com/mapbox-gl-js/api/#map#flyto.
* It implements “Smooth and efficient zooming and panning.” algorithm by
* "Jarke J. van Wijk and Wim A.A. Nuij"
*/
function flyToViewport(startProps, endProps, t, options) {
	const { startZoom, startCenterXY, uDelta, w0, u1, S, rho, rho2, r0 } = getFlyToTransitionParams(startProps, endProps, options);
	if (u1 < EPSILON) {
		const viewport = {};
		for (const key of VIEWPORT_TRANSITION_PROPS) {
			const startValue = startProps[key];
			const endValue = endProps[key];
			viewport[key] = lerp(startValue, endValue, t);
		}
		return viewport;
	}
	const s = t * S;
	const w = Math.cosh(r0) / Math.cosh(r0 + rho * s);
	const u = w0 * ((Math.cosh(r0) * Math.tanh(r0 + rho * s) - Math.sinh(r0)) / rho2) / u1;
	const newZoom = startZoom + scaleToZoom(1 / w);
	const newCenterWorld = scale$2([], uDelta, u);
	add(newCenterWorld, newCenterWorld, startCenterXY);
	const newCenter = worldToLngLat(newCenterWorld);
	return {
		longitude: newCenter[0],
		latitude: newCenter[1],
		zoom: newZoom
	};
}
function getFlyToDuration(startProps, endProps, options) {
	const opts = {
		...DEFAULT_OPTS,
		...options
	};
	const { screenSpeed, speed, maxDuration } = opts;
	const { S, rho } = getFlyToTransitionParams(startProps, endProps, opts);
	const length = 1e3 * S;
	let duration;
	if (Number.isFinite(screenSpeed)) duration = length / (screenSpeed / rho);
	else duration = length / speed;
	return Number.isFinite(maxDuration) && duration > maxDuration ? 0 : duration;
}
function getFlyToTransitionParams(startProps, endProps, opts) {
	opts = Object.assign({}, DEFAULT_OPTS, opts);
	const rho = opts.curve;
	const startZoom = startProps.zoom;
	const startCenter = [startProps.longitude, startProps.latitude];
	const startScale = zoomToScale(startZoom);
	const endZoom = endProps.zoom;
	const endCenter = [endProps.longitude, endProps.latitude];
	const scale = zoomToScale(endZoom - startZoom);
	const startCenterXY = lngLatToWorld(startCenter);
	const uDelta = sub$1([], lngLatToWorld(endCenter), startCenterXY);
	const w0 = Math.max(startProps.width, startProps.height);
	const w1 = w0 / scale;
	const u1 = length$1(uDelta) * startScale;
	const _u1 = Math.max(u1, EPSILON);
	const rho2 = rho * rho;
	const b0 = (w1 * w1 - w0 * w0 + rho2 * rho2 * _u1 * _u1) / (2 * w0 * rho2 * _u1);
	const b1 = (w1 * w1 - w0 * w0 - rho2 * rho2 * _u1 * _u1) / (2 * w1 * rho2 * _u1);
	const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
	const r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
	return {
		startZoom,
		startCenterXY,
		uDelta,
		w0,
		u1,
		S: (r1 - r0) / rho,
		rho,
		rho2,
		r0,
		r1
	};
}
//#endregion
//#region node_modules/@deck.gl/core/dist/utils/typed-array-manager.js
var TypedArrayManager = class {
	constructor(options = {}) {
		this._pool = [];
		this.opts = {
			overAlloc: 2,
			poolSize: 100
		};
		this.setOptions(options);
	}
	setOptions(options) {
		Object.assign(this.opts, options);
	}
	allocate(typedArray, count, { size = 1, type, padding = 0, copy = false, initialize = false, maxCount }) {
		const Type = type || typedArray && typedArray.constructor || Float32Array;
		const newSize = count * size + padding;
		if (ArrayBuffer.isView(typedArray)) {
			if (newSize <= typedArray.length) return typedArray;
			if (newSize * typedArray.BYTES_PER_ELEMENT <= typedArray.buffer.byteLength) return new Type(typedArray.buffer, 0, newSize);
		}
		let maxSize = Infinity;
		if (maxCount) maxSize = maxCount * size + padding;
		const newArray = this._allocate(Type, newSize, initialize, maxSize);
		if (typedArray && copy) newArray.set(typedArray);
		else if (!initialize) newArray.fill(0, 0, 4);
		this._release(typedArray);
		return newArray;
	}
	release(typedArray) {
		this._release(typedArray);
	}
	_allocate(Type, size, initialize, maxSize) {
		let sizeToAllocate = Math.max(Math.ceil(size * this.opts.overAlloc), 1);
		if (sizeToAllocate > maxSize) sizeToAllocate = maxSize;
		const pool = this._pool;
		const byteLength = Type.BYTES_PER_ELEMENT * sizeToAllocate;
		const i = pool.findIndex((b) => b.byteLength >= byteLength);
		if (i >= 0) {
			const array = new Type(pool.splice(i, 1)[0], 0, sizeToAllocate);
			if (initialize) array.fill(0);
			return array;
		}
		return new Type(sizeToAllocate);
	}
	_release(typedArray) {
		if (!ArrayBuffer.isView(typedArray)) return;
		const pool = this._pool;
		const { buffer } = typedArray;
		const { byteLength } = buffer;
		const i = pool.findIndex((b) => b.byteLength >= byteLength);
		if (i < 0) pool.push(buffer);
		else if (i > 0 || pool.length < this.opts.poolSize) pool.splice(i, 0, buffer);
		if (pool.length > this.opts.poolSize) pool.shift();
	}
};
var typed_array_manager_default = new TypedArrayManager();
//#endregion
//#region node_modules/@deck.gl/core/dist/utils/math-utils.js
function createMat4() {
	return [
		1,
		0,
		0,
		0,
		0,
		1,
		0,
		0,
		0,
		0,
		1,
		0,
		0,
		0,
		0,
		1
	];
}
function mod(value, divisor) {
	const modulus = value % divisor;
	return modulus < 0 ? divisor + modulus : modulus;
}
function getCameraPosition(viewMatrixInverse) {
	return [
		viewMatrixInverse[12],
		viewMatrixInverse[13],
		viewMatrixInverse[14]
	];
}
function getFrustumPlanes(viewProjectionMatrix) {
	return {
		left: getFrustumPlane(viewProjectionMatrix[3] + viewProjectionMatrix[0], viewProjectionMatrix[7] + viewProjectionMatrix[4], viewProjectionMatrix[11] + viewProjectionMatrix[8], viewProjectionMatrix[15] + viewProjectionMatrix[12]),
		right: getFrustumPlane(viewProjectionMatrix[3] - viewProjectionMatrix[0], viewProjectionMatrix[7] - viewProjectionMatrix[4], viewProjectionMatrix[11] - viewProjectionMatrix[8], viewProjectionMatrix[15] - viewProjectionMatrix[12]),
		bottom: getFrustumPlane(viewProjectionMatrix[3] + viewProjectionMatrix[1], viewProjectionMatrix[7] + viewProjectionMatrix[5], viewProjectionMatrix[11] + viewProjectionMatrix[9], viewProjectionMatrix[15] + viewProjectionMatrix[13]),
		top: getFrustumPlane(viewProjectionMatrix[3] - viewProjectionMatrix[1], viewProjectionMatrix[7] - viewProjectionMatrix[5], viewProjectionMatrix[11] - viewProjectionMatrix[9], viewProjectionMatrix[15] - viewProjectionMatrix[13]),
		near: getFrustumPlane(viewProjectionMatrix[3] + viewProjectionMatrix[2], viewProjectionMatrix[7] + viewProjectionMatrix[6], viewProjectionMatrix[11] + viewProjectionMatrix[10], viewProjectionMatrix[15] + viewProjectionMatrix[14]),
		far: getFrustumPlane(viewProjectionMatrix[3] - viewProjectionMatrix[2], viewProjectionMatrix[7] - viewProjectionMatrix[6], viewProjectionMatrix[11] - viewProjectionMatrix[10], viewProjectionMatrix[15] - viewProjectionMatrix[14])
	};
}
var scratchVector = new Vector3();
function getFrustumPlane(a, b, c, d) {
	scratchVector.set(a, b, c);
	const L = scratchVector.len();
	return {
		distance: d / L,
		normal: new Vector3(-a / L, -b / L, -c / L)
	};
}
/**
* Calculate the low part of a WebGL 64 bit float
* @param x {number} - the input float number
* @returns {number} - the lower 32 bit of the number
*/
function fp64LowPart(x) {
	return x - Math.fround(x);
}
var scratchArray;
/**
* Split a Float64Array into a double-length Float32Array
* @param typedArray
* @param options
* @param options.size  - per attribute size
* @param options.startIndex - start index in the source array
* @param options.endIndex  - end index in the source array
* @returns {} - high part, low part for each attribute:
[1xHi, 1yHi, 1zHi, 1xLow, 1yLow, 1zLow, 2xHi, ...]
*/
function toDoublePrecisionArray(typedArray, options) {
	const { size = 1, startIndex = 0 } = options;
	const endIndex = options.endIndex !== void 0 ? options.endIndex : typedArray.length;
	const count = (endIndex - startIndex) / size;
	scratchArray = typed_array_manager_default.allocate(scratchArray, count, {
		type: Float32Array,
		size: size * 2
	});
	let sourceIndex = startIndex;
	let targetIndex = 0;
	while (sourceIndex < endIndex) {
		for (let j = 0; j < size; j++) {
			const value = typedArray[sourceIndex++];
			scratchArray[targetIndex + j] = value;
			scratchArray[targetIndex + j + size] = fp64LowPart(value);
		}
		targetIndex += size * 2;
	}
	return scratchArray.subarray(0, count * size * 2);
}
function mergeBounds(boundsList) {
	let mergedBounds = null;
	let isMerged = false;
	for (const bounds of boundsList) {
		if (!bounds) continue;
		if (!mergedBounds) mergedBounds = bounds;
		else {
			if (!isMerged) {
				mergedBounds = [[mergedBounds[0][0], mergedBounds[0][1]], [mergedBounds[1][0], mergedBounds[1][1]]];
				isMerged = true;
			}
			mergedBounds[0][0] = Math.min(mergedBounds[0][0], bounds[0][0]);
			mergedBounds[0][1] = Math.min(mergedBounds[0][1], bounds[0][1]);
			mergedBounds[1][0] = Math.max(mergedBounds[1][0], bounds[1][0]);
			mergedBounds[1][1] = Math.max(mergedBounds[1][1], bounds[1][1]);
		}
	}
	return mergedBounds;
}
//#endregion
//#region node_modules/@deck.gl/core/dist/viewports/viewport.js
var DEGREES_TO_RADIANS = Math.PI / 180;
var IDENTITY = createMat4();
var ZERO_VECTOR = [
	0,
	0,
	0
];
var DEFAULT_DISTANCE_SCALES = {
	unitsPerMeter: [
		1,
		1,
		1
	],
	metersPerUnit: [
		1,
		1,
		1
	]
};
function createProjectionMatrix({ width, height, orthographic, fovyRadians, focalDistance, padding, near, far }) {
	const aspect = width / height;
	const matrix = orthographic ? new Matrix4().orthographic({
		fovy: fovyRadians,
		aspect,
		focalDistance,
		near,
		far
	}) : new Matrix4().perspective({
		fovy: fovyRadians,
		aspect,
		near,
		far
	});
	if (padding) {
		const { left = 0, right = 0, top = 0, bottom = 0 } = padding;
		const offsetX = clamp$1((left + width - right) / 2, 0, width) - width / 2;
		const offsetY = clamp$1((top + height - bottom) / 2, 0, height) - height / 2;
		matrix[8] -= offsetX * 2 / width;
		matrix[9] += offsetY * 2 / height;
	}
	return matrix;
}
/**
* Manages coordinate system transformations.
*
* Note: The Viewport is immutable in the sense that it only has accessors.
* A new viewport instance should be created if any parameters have changed.
*/
var Viewport = class Viewport {
	constructor(opts = {}) {
		this._frustumPlanes = {};
		this.id = opts.id || this.constructor.displayName || "viewport";
		this.x = opts.x || 0;
		this.y = opts.y || 0;
		this.width = opts.width || 1;
		this.height = opts.height || 1;
		this.zoom = opts.zoom || 0;
		this.padding = opts.padding;
		this.distanceScales = opts.distanceScales || DEFAULT_DISTANCE_SCALES;
		this.focalDistance = opts.focalDistance || 1;
		this.position = opts.position || ZERO_VECTOR;
		this.modelMatrix = opts.modelMatrix || null;
		const { longitude, latitude } = opts;
		this.isGeospatial = Number.isFinite(latitude) && Number.isFinite(longitude);
		this._initProps(opts);
		this._initMatrices(opts);
		this.equals = this.equals.bind(this);
		this.project = this.project.bind(this);
		this.unproject = this.unproject.bind(this);
		this.projectPosition = this.projectPosition.bind(this);
		this.unprojectPosition = this.unprojectPosition.bind(this);
		this.projectFlat = this.projectFlat.bind(this);
		this.unprojectFlat = this.unprojectFlat.bind(this);
	}
	get subViewports() {
		return null;
	}
	get metersPerPixel() {
		return this.distanceScales.metersPerUnit[2] / this.scale;
	}
	get projectionMode() {
		if (this.isGeospatial) return this.zoom < 12 ? PROJECTION_MODE.WEB_MERCATOR : PROJECTION_MODE.WEB_MERCATOR_AUTO_OFFSET;
		return PROJECTION_MODE.IDENTITY;
	}
	equals(viewport) {
		if (!(viewport instanceof Viewport)) return false;
		if (this === viewport) return true;
		return viewport.width === this.width && viewport.height === this.height && viewport.scale === this.scale && equals(viewport.projectionMatrix, this.projectionMatrix) && equals(viewport.viewMatrix, this.viewMatrix);
	}
	/**
	* Projects xyz (possibly latitude and longitude) to pixel coordinates in window
	* using viewport projection parameters
	* - [longitude, latitude] to [x, y]
	* - [longitude, latitude, Z] => [x, y, z]
	* Note: By default, returns top-left coordinates for canvas/SVG type render
	*
	* @param {Array} lngLatZ - [lng, lat] or [lng, lat, Z]
	* @param {Object} opts - options
	* @param {Object} opts.topLeft=true - Whether projected coords are top left
	* @return {Array} - [x, y] or [x, y, z] in top left coords
	*/
	project(xyz, { topLeft = true } = {}) {
		const coord = worldToPixels(this.projectPosition(xyz), this.pixelProjectionMatrix);
		const [x, y] = coord;
		const y2 = topLeft ? y : this.height - y;
		return xyz.length === 2 ? [x, y2] : [
			x,
			y2,
			coord[2]
		];
	}
	/**
	* Unproject pixel coordinates on screen onto world coordinates,
	* (possibly [lon, lat]) on map.
	* - [x, y] => [lng, lat]
	* - [x, y, z] => [lng, lat, Z]
	* @param {Array} xyz -
	* @param {Object} opts - options
	* @param {Object} opts.topLeft=true - Whether origin is top left
	* @return {Array|null} - [lng, lat, Z] or [X, Y, Z]
	*/
	unproject(xyz, { topLeft = true, targetZ } = {}) {
		const [x, y, z] = xyz;
		const y2 = topLeft ? y : this.height - y;
		const targetZWorld = targetZ && targetZ * this.distanceScales.unitsPerMeter[2];
		const coord = pixelsToWorld([
			x,
			y2,
			z
		], this.pixelUnprojectionMatrix, targetZWorld);
		const [X, Y, Z] = this.unprojectPosition(coord);
		if (Number.isFinite(z)) return [
			X,
			Y,
			Z
		];
		return Number.isFinite(targetZ) ? [
			X,
			Y,
			targetZ
		] : [X, Y];
	}
	projectPosition(xyz) {
		const [X, Y] = this.projectFlat(xyz);
		return [
			X,
			Y,
			(xyz[2] || 0) * this.distanceScales.unitsPerMeter[2]
		];
	}
	unprojectPosition(xyz) {
		const [X, Y] = this.unprojectFlat(xyz);
		return [
			X,
			Y,
			(xyz[2] || 0) * this.distanceScales.metersPerUnit[2]
		];
	}
	/**
	* Project [lng,lat] on sphere onto [x,y] on 512*512 Mercator Zoom 0 tile.
	* Performs the nonlinear part of the web mercator projection.
	* Remaining projection is done with 4x4 matrices which also handles
	* perspective.
	* @param {Array} lngLat - [lng, lat] coordinates
	*   Specifies a point on the sphere to project onto the map.
	* @return {Array} [x,y] coordinates.
	*/
	projectFlat(xyz) {
		if (this.isGeospatial) {
			const result = lngLatToWorld(xyz);
			result[1] = clamp$1(result[1], -318, 830);
			return result;
		}
		return xyz;
	}
	/**
	* Unproject world point [x,y] on map onto {lat, lon} on sphere
	* @param {object|Vector} xy - object with {x,y} members
	*  representing point on projected map plane
	* @return {GeoCoordinates} - object with {lat,lon} of point on sphere.
	*   Has toArray method if you need a GeoJSON Array.
	*   Per cartographic tradition, lat and lon are specified as degrees.
	*/
	unprojectFlat(xyz) {
		if (this.isGeospatial) return worldToLngLat(xyz);
		return xyz;
	}
	/**
	* Get bounds of the current viewport
	* @return {Array} - [minX, minY, maxX, maxY]
	*/
	getBounds(options = {}) {
		const unprojectOption = { targetZ: options.z || 0 };
		const topLeft = this.unproject([0, 0], unprojectOption);
		const topRight = this.unproject([this.width, 0], unprojectOption);
		const bottomLeft = this.unproject([0, this.height], unprojectOption);
		const bottomRight = this.unproject([this.width, this.height], unprojectOption);
		return [
			Math.min(topLeft[0], topRight[0], bottomLeft[0], bottomRight[0]),
			Math.min(topLeft[1], topRight[1], bottomLeft[1], bottomRight[1]),
			Math.max(topLeft[0], topRight[0], bottomLeft[0], bottomRight[0]),
			Math.max(topLeft[1], topRight[1], bottomLeft[1], bottomRight[1])
		];
	}
	getDistanceScales(coordinateOrigin) {
		if (coordinateOrigin && this.isGeospatial) return getDistanceScales({
			longitude: coordinateOrigin[0],
			latitude: coordinateOrigin[1],
			highPrecision: true
		});
		return this.distanceScales;
	}
	containsPixel({ x, y, width = 1, height = 1 }) {
		return x < this.x + this.width && this.x < x + width && y < this.y + this.height && this.y < y + height;
	}
	getFrustumPlanes() {
		if (this._frustumPlanes.near) return this._frustumPlanes;
		Object.assign(this._frustumPlanes, getFrustumPlanes(this.viewProjectionMatrix));
		return this._frustumPlanes;
	}
	/**
	* Needed by panning and linear transition
	* Pan the viewport to place a given world coordinate at screen point [x, y]
	*
	* @param {Array} coords - world coordinates
	* @param {Array} pixel - [x,y] coordinates on screen
	* @param {Array} startPixel - [x,y] screen position where pan started (optional, for delta-based panning)
	* @return {Object} props of the new viewport
	*/
	panByPosition(coords, pixel, startPixel) {
		return null;
	}
	_initProps(opts) {
		const longitude = opts.longitude;
		const latitude = opts.latitude;
		if (this.isGeospatial) {
			if (!Number.isFinite(opts.zoom)) this.zoom = getMeterZoom({ latitude }) + Math.log2(this.focalDistance);
			this.distanceScales = opts.distanceScales || getDistanceScales({
				latitude,
				longitude
			});
		}
		const scale = Math.pow(2, this.zoom);
		this.scale = scale;
		const { position, modelMatrix } = opts;
		let meterOffset = ZERO_VECTOR;
		if (position) meterOffset = modelMatrix ? new Matrix4(modelMatrix).transformAsVector(position, []) : position;
		if (this.isGeospatial) {
			const center = this.projectPosition([
				longitude,
				latitude,
				0
			]);
			this.center = new Vector3(meterOffset).scale(this.distanceScales.unitsPerMeter).add(center);
		} else this.center = this.projectPosition(meterOffset);
	}
	_initMatrices(opts) {
		const { viewMatrix = IDENTITY, projectionMatrix = null, orthographic = false, fovyRadians, fovy = 75, near = .1, far = 1e3, padding = null, focalDistance = 1 } = opts;
		this.viewMatrixUncentered = viewMatrix;
		this.viewMatrix = new Matrix4().multiplyRight(viewMatrix).translate(new Vector3(this.center).negate());
		this.projectionMatrix = projectionMatrix || createProjectionMatrix({
			width: this.width,
			height: this.height,
			orthographic,
			fovyRadians: fovyRadians || fovy * DEGREES_TO_RADIANS,
			focalDistance,
			padding,
			near,
			far
		});
		const vpm = createMat4();
		multiply(vpm, vpm, this.projectionMatrix);
		multiply(vpm, vpm, this.viewMatrix);
		this.viewProjectionMatrix = vpm;
		this.viewMatrixInverse = invert([], this.viewMatrix) || this.viewMatrix;
		this.cameraPosition = getCameraPosition(this.viewMatrixInverse);
		const viewportMatrix = createMat4();
		const pixelProjectionMatrix = createMat4();
		scale$1(viewportMatrix, viewportMatrix, [
			this.width / 2,
			-this.height / 2,
			1
		]);
		translate(viewportMatrix, viewportMatrix, [
			1,
			-1,
			0
		]);
		multiply(pixelProjectionMatrix, viewportMatrix, this.viewProjectionMatrix);
		this.pixelProjectionMatrix = pixelProjectionMatrix;
		this.pixelUnprojectionMatrix = invert(createMat4(), this.pixelProjectionMatrix);
		if (!this.pixelUnprojectionMatrix) defaultLogger.warn("Pixel project matrix not invertible")();
	}
};
Viewport.displayName = "Viewport";
//#endregion
//#region node_modules/@deck.gl/core/dist/viewports/web-mercator-viewport.js
/**
* Manages transformations to/from WGS84 coordinates using the Web Mercator Projection.
*/
var WebMercatorViewport = class WebMercatorViewport extends Viewport {
	constructor(opts = {}) {
		const { latitude = 0, longitude = 0, zoom = 0, pitch = 0, bearing = 0, nearZMultiplier = .1, farZMultiplier = 1.01, nearZ, farZ, orthographic = false, projectionMatrix, repeat = false, worldOffset = 0, position, padding, legacyMeterSizes = false } = opts;
		let { width, height, altitude = 1.5 } = opts;
		const scale = Math.pow(2, zoom);
		width = width || 1;
		height = height || 1;
		let fovy;
		let projectionParameters = null;
		if (projectionMatrix) {
			altitude = projectionMatrix[5] / 2;
			fovy = altitudeToFovy(altitude);
		} else {
			if (opts.fovy) {
				fovy = opts.fovy;
				altitude = fovyToAltitude(fovy);
			} else fovy = altitudeToFovy(altitude);
			let offset;
			if (padding) {
				const { top = 0, bottom = 0 } = padding;
				offset = [0, clamp$1((top + height - bottom) / 2, 0, height) - height / 2];
			}
			projectionParameters = getProjectionParameters({
				width,
				height,
				scale,
				center: position && [
					0,
					0,
					position[2] * unitsPerMeter(latitude)
				],
				offset,
				pitch,
				fovy,
				nearZMultiplier,
				farZMultiplier
			});
			if (Number.isFinite(nearZ)) projectionParameters.near = nearZ;
			if (Number.isFinite(farZ)) projectionParameters.far = farZ;
		}
		let viewMatrixUncentered = getViewMatrix({
			height,
			pitch,
			bearing,
			scale,
			altitude
		});
		if (worldOffset) viewMatrixUncentered = new Matrix4().translate([
			512 * worldOffset,
			0,
			0
		]).multiplyLeft(viewMatrixUncentered);
		super({
			...opts,
			width,
			height,
			viewMatrix: viewMatrixUncentered,
			longitude,
			latitude,
			zoom,
			...projectionParameters,
			fovy,
			focalDistance: altitude
		});
		this.latitude = latitude;
		this.longitude = longitude;
		this.zoom = zoom;
		this.pitch = pitch;
		this.bearing = bearing;
		this.altitude = altitude;
		this.fovy = fovy;
		this.orthographic = orthographic;
		this._subViewports = repeat ? [] : null;
		this._pseudoMeters = legacyMeterSizes;
		Object.freeze(this);
	}
	get subViewports() {
		if (this._subViewports && !this._subViewports.length) {
			const bounds = this.getBounds();
			const minOffset = Math.floor((bounds[0] + 180) / 360);
			const maxOffset = Math.ceil((bounds[2] - 180) / 360);
			for (let x = minOffset; x <= maxOffset; x++) {
				const offsetViewport = x ? new WebMercatorViewport({
					...this,
					worldOffset: x
				}) : this;
				this._subViewports.push(offsetViewport);
			}
		}
		return this._subViewports;
	}
	projectPosition(xyz) {
		if (this._pseudoMeters) return super.projectPosition(xyz);
		const [X, Y] = this.projectFlat(xyz);
		return [
			X,
			Y,
			(xyz[2] || 0) * unitsPerMeter(xyz[1])
		];
	}
	unprojectPosition(xyz) {
		if (this._pseudoMeters) return super.unprojectPosition(xyz);
		const [X, Y] = this.unprojectFlat(xyz);
		return [
			X,
			Y,
			(xyz[2] || 0) / unitsPerMeter(Y)
		];
	}
	/**
	* Add a meter delta to a base lnglat coordinate, returning a new lnglat array
	*
	* Note: Uses simple linear approximation around the viewport center
	* Error increases with size of offset (roughly 1% per 100km)
	*
	* @param {[Number,Number]|[Number,Number,Number]) lngLatZ - base coordinate
	* @param {[Number,Number]|[Number,Number,Number]) xyz - array of meter deltas
	* @return {[Number,Number]|[Number,Number,Number]) array of [lng,lat,z] deltas
	*/
	addMetersToLngLat(lngLatZ, xyz) {
		return addMetersToLngLat(lngLatZ, xyz);
	}
	panByPosition(coords, pixel, startPixel) {
		const fromLocation = pixelsToWorld(pixel, this.pixelUnprojectionMatrix);
		const translate = add([], this.projectFlat(coords), negate$1([], fromLocation));
		const newCenter = add([], this.center, translate);
		const [longitude, latitude] = this.unprojectFlat(newCenter);
		return {
			longitude,
			latitude
		};
	}
	/**
	* Returns a new longitude and latitude that keeps a 3D world coordinate at a given screen pixel
	* This version handles the z-component (altitude) properly for cameras positioned above ground
	*/
	panByPosition3D(coords, pixel) {
		const targetZ = coords[2] || 0;
		const deltaLngLat = sub$1([], coords, this.unproject(pixel, { targetZ }));
		return {
			longitude: this.longitude + deltaLngLat[0],
			latitude: this.latitude + deltaLngLat[1]
		};
	}
	getBounds(options = {}) {
		const corners = getBounds(this, options.z || 0);
		return [
			Math.min(corners[0][0], corners[1][0], corners[2][0], corners[3][0]),
			Math.min(corners[0][1], corners[1][1], corners[2][1], corners[3][1]),
			Math.max(corners[0][0], corners[1][0], corners[2][0], corners[3][0]),
			Math.max(corners[0][1], corners[1][1], corners[2][1], corners[3][1])
		];
	}
	/**
	* Returns a new viewport that fit around the given rectangle.
	* Only supports non-perspective mode.
	*/
	fitBounds(bounds, options = {}) {
		const { width, height } = this;
		const { longitude, latitude, zoom } = fitBounds({
			width,
			height,
			bounds,
			...options
		});
		return new WebMercatorViewport({
			width,
			height,
			longitude,
			latitude,
			zoom
		});
	}
};
WebMercatorViewport.displayName = "WebMercatorViewport";
//#endregion
//#region node_modules/@luma.gl/engine/dist/utils/uid.js
var uidCounters = {};
/**
* Returns a UID.
* @param id= - Identifier base name
* @return uid
**/
function uid(id = "id") {
	uidCounters[id] = uidCounters[id] || 1;
	return `${id}-${uidCounters[id]++}`;
}
//#endregion
//#region node_modules/@luma.gl/engine/dist/geometry/gpu-geometry.js
var GPUGeometry = class {
	id;
	userData = {};
	/** Determines how vertices are read from the 'vertex' attributes */
	topology;
	bufferLayout = [];
	vertexCount;
	indices;
	attributes;
	constructor(props) {
		this.id = props.id || uid("geometry");
		this.topology = props.topology;
		this.indices = props.indices || null;
		this.attributes = props.attributes;
		this.vertexCount = props.vertexCount;
		this.bufferLayout = props.bufferLayout || [];
		if (this.indices) {
			if (!(this.indices.usage & Buffer.INDEX)) throw new Error("Index buffer must have INDEX usage");
		}
	}
	destroy() {
		this.indices?.destroy();
		for (const attribute of Object.values(this.attributes)) attribute.destroy();
	}
	getVertexCount() {
		return this.vertexCount;
	}
	getAttributes() {
		return this.attributes;
	}
	getIndexes() {
		return this.indices || null;
	}
	_calculateVertexCount(positions) {
		return positions.byteLength / 12;
	}
};
function makeGPUGeometry(device, geometry) {
	if (geometry instanceof GPUGeometry) return geometry;
	const indices = getIndexBufferFromGeometry(device, geometry);
	const { attributes, bufferLayout } = getAttributeBuffersFromGeometry(device, geometry);
	return new GPUGeometry({
		topology: geometry.topology || "triangle-list",
		bufferLayout,
		vertexCount: geometry.vertexCount,
		indices,
		attributes
	});
}
function getIndexBufferFromGeometry(device, geometry) {
	if (!geometry.indices) return;
	const data = geometry.indices.value;
	return device.createBuffer({
		usage: Buffer.INDEX,
		data
	});
}
function getAttributeBuffersFromGeometry(device, geometry) {
	const bufferLayout = [];
	const attributes = {};
	for (const [attributeName, attribute] of Object.entries(geometry.attributes)) {
		let name = attributeName;
		switch (attributeName) {
			case "POSITION":
				name = "positions";
				break;
			case "NORMAL":
				name = "normals";
				break;
			case "TEXCOORD_0":
				name = "texCoords";
				break;
			case "TEXCOORD_1":
				name = "texCoords1";
				break;
			case "COLOR_0":
				name = "colors";
				break;
		}
		if (attribute) {
			attributes[name] = device.createBuffer({
				data: attribute.value,
				id: `${attributeName}-buffer`
			});
			const { value, size, normalized } = attribute;
			if (size === void 0) throw new Error(`Attribute ${attributeName} is missing a size`);
			bufferLayout.push({
				name,
				format: vertexFormatDecoder.getVertexFormatFromAttribute(value, size, normalized)
			});
		}
	}
	return {
		attributes,
		bufferLayout,
		vertexCount: geometry._calculateVertexCount(geometry.attributes, geometry.indices)
	};
}
//#endregion
//#region node_modules/@luma.gl/engine/dist/debug/debug-shader-layout.js
/**
* Extracts a table suitable for `console.table()` from a shader layout to assist in debugging.
* @param layout shader layout
* @param name app should provide the most meaningful name, usually the model or pipeline name / id.
* @returns
*/
function getDebugTableForShaderLayout(layout, name) {
	const table = {};
	const header = "Values";
	if (layout.attributes.length === 0 && !layout.varyings?.length) return { "No attributes or varyings": { [header]: "N/A" } };
	for (const attributeDeclaration of layout.attributes) if (attributeDeclaration) {
		const glslDeclaration = `${attributeDeclaration.location} ${attributeDeclaration.name}: ${attributeDeclaration.type}`;
		table[`in ${glslDeclaration}`] = { [header]: attributeDeclaration.stepMode || "vertex" };
	}
	for (const varyingDeclaration of layout.varyings || []) {
		const glslDeclaration = `${varyingDeclaration.location} ${varyingDeclaration.name}`;
		table[`out ${glslDeclaration}`] = { [header]: JSON.stringify(varyingDeclaration) };
	}
	return table;
}
//#endregion
//#region node_modules/@luma.gl/engine/dist/debug/debug-framebuffer.js
var DEBUG_FRAMEBUFFER_STATE_KEY = "__debugFramebufferState";
var DEFAULT_MARGIN_PX = 8;
/**
* Debug utility to blit queued offscreen framebuffers into the default framebuffer
* without CPU readback. Currently implemented for WebGL only.
*/
function debugFramebuffer(renderPass, source, options) {
	if (renderPass.device.type !== "webgl") return;
	const state = getDebugFramebufferState(renderPass.device);
	if (state.flushing) return;
	if (isDefaultRenderPass(renderPass)) {
		flushDebugFramebuffers(renderPass, options, state);
		return;
	}
	if (source && isFramebuffer(source) && source.handle !== null) {
		if (!state.queuedFramebuffers.includes(source)) state.queuedFramebuffers.push(source);
	}
}
function flushDebugFramebuffers(renderPass, options, state) {
	if (state.queuedFramebuffers.length === 0) return;
	const { gl } = renderPass.device;
	const previousReadFramebuffer = gl.getParameter(36010);
	const previousDrawFramebuffer = gl.getParameter(36006);
	const [targetWidth, targetHeight] = renderPass.device.getDefaultCanvasContext().getDrawingBufferSize();
	let topPx = parseCssPixel(options.top, DEFAULT_MARGIN_PX);
	const leftPx = parseCssPixel(options.left, DEFAULT_MARGIN_PX);
	state.flushing = true;
	try {
		for (const framebuffer of state.queuedFramebuffers) {
			const [targetX0, targetY0, targetX1, targetY1, previewHeight] = getOverlayRect({
				framebuffer,
				targetWidth,
				targetHeight,
				topPx,
				leftPx,
				minimap: options.minimap
			});
			gl.bindFramebuffer(36008, framebuffer.handle);
			gl.bindFramebuffer(36009, null);
			gl.blitFramebuffer(0, 0, framebuffer.width, framebuffer.height, targetX0, targetY0, targetX1, targetY1, 16384, 9728);
			topPx += previewHeight + DEFAULT_MARGIN_PX;
		}
	} finally {
		gl.bindFramebuffer(36008, previousReadFramebuffer);
		gl.bindFramebuffer(36009, previousDrawFramebuffer);
		state.flushing = false;
	}
}
function getOverlayRect(options) {
	const { framebuffer, targetWidth, targetHeight, topPx, leftPx, minimap } = options;
	const maxWidth = minimap ? Math.max(Math.floor(targetWidth / 4), 1) : targetWidth;
	const maxHeight = minimap ? Math.max(Math.floor(targetHeight / 4), 1) : targetHeight;
	const scale = Math.min(maxWidth / framebuffer.width, maxHeight / framebuffer.height);
	const previewWidth = Math.max(Math.floor(framebuffer.width * scale), 1);
	const previewHeight = Math.max(Math.floor(framebuffer.height * scale), 1);
	const targetX0 = leftPx;
	const targetY0 = Math.max(targetHeight - topPx - previewHeight, 0);
	return [
		targetX0,
		targetY0,
		targetX0 + previewWidth,
		targetY0 + previewHeight,
		previewHeight
	];
}
function getDebugFramebufferState(device) {
	device.userData[DEBUG_FRAMEBUFFER_STATE_KEY] ||= {
		flushing: false,
		queuedFramebuffers: []
	};
	return device.userData[DEBUG_FRAMEBUFFER_STATE_KEY];
}
function isFramebuffer(value) {
	return "colorAttachments" in value;
}
function isDefaultRenderPass(renderPass) {
	const framebuffer = renderPass.props.framebuffer;
	return !framebuffer || framebuffer.handle === null;
}
function parseCssPixel(value, defaultValue) {
	if (!value) return defaultValue;
	const parsedValue = Number.parseInt(value, 10);
	return Number.isFinite(parsedValue) ? parsedValue : defaultValue;
}
//#endregion
//#region node_modules/@luma.gl/engine/dist/utils/deep-equal.js
/**
* Fast partial deep equal for prop.
*
* @param a Prop
* @param b Prop to compare against `a`
* @param depth Depth to which to recurse in nested Objects/Arrays. Use 0 (default) for shallow comparison, -1 for infinite depth
*/
function deepEqual$1(a, b, depth) {
	if (a === b) return true;
	if (!depth || !a || !b) return false;
	if (Array.isArray(a)) {
		if (!Array.isArray(b) || a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) if (!deepEqual$1(a[i], b[i], depth - 1)) return false;
		return true;
	}
	if (Array.isArray(b)) return false;
	if (typeof a === "object" && typeof b === "object") {
		const aKeys = Object.keys(a);
		const bKeys = Object.keys(b);
		if (aKeys.length !== bKeys.length) return false;
		for (const key of aKeys) {
			if (!b.hasOwnProperty(key)) return false;
			if (!deepEqual$1(a[key], b[key], depth - 1)) return false;
		}
		return true;
	}
	return false;
}
//#endregion
//#region node_modules/@luma.gl/engine/dist/utils/buffer-layout-helper.js
/** BufferLayoutHelper is a helper class that should not be used directly by applications */
var BufferLayoutHelper = class {
	bufferLayouts;
	constructor(bufferLayouts) {
		this.bufferLayouts = bufferLayouts;
	}
	getBufferLayout(name) {
		return this.bufferLayouts.find((layout) => layout.name === name) || null;
	}
	/** Get attribute names from a BufferLayout */
	getAttributeNamesForBuffer(bufferLayout) {
		return bufferLayout.attributes ? bufferLayout.attributes?.map((layout) => layout.attribute) : [bufferLayout.name];
	}
	mergeBufferLayouts(bufferLayouts1, bufferLayouts2) {
		const mergedLayouts = [...bufferLayouts1];
		for (const attribute of bufferLayouts2) {
			const index = mergedLayouts.findIndex((attribute2) => attribute2.name === attribute.name);
			if (index < 0) mergedLayouts.push(attribute);
			else mergedLayouts[index] = attribute;
		}
		return mergedLayouts;
	}
	getBufferIndex(bufferName) {
		const bufferIndex = this.bufferLayouts.findIndex((layout) => layout.name === bufferName);
		if (bufferIndex === -1) log.warn(`BufferLayout: Missing buffer for "${bufferName}".`)();
		return bufferIndex;
	}
};
//#endregion
//#region node_modules/@luma.gl/engine/dist/utils/buffer-layout-order.js
function getMinLocation(attributeNames, shaderLayoutMap) {
	let minLocation = Infinity;
	for (const name of attributeNames) {
		const location = shaderLayoutMap[name];
		if (location !== void 0) minLocation = Math.min(minLocation, location);
	}
	return minLocation;
}
function sortedBufferLayoutByShaderSourceLocations(shaderLayout, bufferLayout) {
	const shaderLayoutMap = Object.fromEntries(shaderLayout.attributes.map((attr) => [attr.name, attr.location]));
	const sortedLayout = bufferLayout.slice();
	sortedLayout.sort((a, b) => {
		const attributeNamesA = a.attributes ? a.attributes.map((attr) => attr.attribute) : [a.name];
		const attributeNamesB = b.attributes ? b.attributes.map((attr) => attr.attribute) : [b.name];
		return getMinLocation(attributeNamesA, shaderLayoutMap) - getMinLocation(attributeNamesB, shaderLayoutMap);
	});
	return sortedLayout;
}
//#endregion
//#region node_modules/@luma.gl/engine/dist/utils/shader-module-utils.js
function mergeShaderModuleBindingsIntoLayout(shaderLayout, modules) {
	if (!shaderLayout || !modules.some((module) => module.bindingLayout?.length)) return shaderLayout;
	const mergedLayout = {
		...shaderLayout,
		bindings: shaderLayout.bindings.map((binding) => ({ ...binding }))
	};
	if ("attributes" in (shaderLayout || {})) mergedLayout.attributes = shaderLayout?.attributes || [];
	for (const module of modules) for (const bindingLayout of module.bindingLayout || []) for (const relatedBindingName of getRelatedBindingNames(bindingLayout.name)) {
		const binding = mergedLayout.bindings.find((candidate) => candidate.name === relatedBindingName);
		if (binding?.group === 0) binding.group = bindingLayout.group;
	}
	return mergedLayout;
}
function shaderModuleHasUniforms(module) {
	return Boolean(module.uniformTypes && !isObjectEmpty(module.uniformTypes));
}
/** Returns binding-name aliases that should share the module-declared bind group. */
function getRelatedBindingNames(bindingName) {
	const bindingNames = new Set([bindingName, `${bindingName}Uniforms`]);
	if (!bindingName.endsWith("Uniforms")) bindingNames.add(`${bindingName}Sampler`);
	return [...bindingNames];
}
function isObjectEmpty(obj) {
	for (const key in obj) return false;
	return true;
}
//#endregion
//#region node_modules/@luma.gl/engine/dist/model/split-uniforms-and-bindings.js
function isUniformValue(value) {
	return isNumericArray(value) || typeof value === "number" || typeof value === "boolean";
}
function splitUniformsAndBindings(uniforms, uniformTypes = {}) {
	const result = {
		bindings: {},
		uniforms: {}
	};
	Object.keys(uniforms).forEach((name) => {
		const uniform = uniforms[name];
		if (Object.prototype.hasOwnProperty.call(uniformTypes, name) || isUniformValue(uniform)) result.uniforms[name] = uniform;
		else result.bindings[name] = uniform;
	});
	return result;
}
//#endregion
//#region node_modules/@luma.gl/engine/dist/shader-inputs.js
/**
* ShaderInputs holds uniform and binding values for one or more shader modules,
* - It can generate binary data for any uniform buffer
* - It can manage a uniform buffer for each block
* - It can update managed uniform buffers with a single call
* - It performs some book keeping on what has changed to minimize unnecessary writes to uniform buffers.
*/
var ShaderInputs = class {
	options = { disableWarnings: false };
	/**
	* The map of modules
	* @todo should should this include the resolved dependencies?
	*/
	modules;
	/** Stores the uniform values for each module */
	moduleUniforms;
	/** Stores the uniform bindings for each module  */
	moduleBindings;
	/** Tracks if uniforms have changed */
	/**
	* Create a new UniformStore instance
	* @param modules
	*/
	constructor(modules, options) {
		Object.assign(this.options, options);
		const resolvedModules = getShaderModuleDependencies(Object.values(modules).filter(isShaderInputsModuleWithDependencies));
		for (const resolvedModule of resolvedModules) modules[resolvedModule.name] = resolvedModule;
		log.log(1, "Creating ShaderInputs with modules", Object.keys(modules))();
		this.modules = modules;
		this.moduleUniforms = {};
		this.moduleBindings = {};
		for (const [name, module] of Object.entries(modules)) if (module) {
			this._addModule(module);
			if (module.name && name !== module.name && !this.options.disableWarnings) log.warn(`Module name: ${name} vs ${module.name}`)();
		}
	}
	/** Destroy */
	destroy() {}
	/**
	* Set module props
	*/
	setProps(props) {
		for (const name of Object.keys(props)) {
			const moduleName = name;
			const moduleProps = props[moduleName] || {};
			const module = this.modules[moduleName];
			if (!module) {
				if (!this.options.disableWarnings) log.warn(`Module ${name} not found`)();
			} else {
				const oldUniforms = this.moduleUniforms[moduleName];
				const oldBindings = this.moduleBindings[moduleName];
				const { uniforms, bindings } = splitUniformsAndBindings(module.getUniforms?.(moduleProps, oldUniforms) || moduleProps, module.uniformTypes);
				this.moduleUniforms[moduleName] = mergeModuleUniforms(oldUniforms, uniforms, module.uniformTypes);
				this.moduleBindings[moduleName] = {
					...oldBindings,
					...bindings
				};
			}
		}
	}
	/**
	* Return the map of modules
	* @todo should should this include the resolved dependencies?
	*/
	getModules() {
		return Object.values(this.modules);
	}
	/** Get all uniform values for all modules */
	getUniformValues() {
		return this.moduleUniforms;
	}
	/** Merges all bindings for the shader (from the various modules) */
	getBindingValues() {
		const bindings = {};
		for (const moduleBindings of Object.values(this.moduleBindings)) Object.assign(bindings, moduleBindings);
		return bindings;
	}
	/** Return a debug table that can be used for console.table() or log.table() */
	getDebugTable() {
		const table = {};
		for (const [moduleName, module] of Object.entries(this.moduleUniforms)) for (const [key, value] of Object.entries(module)) table[`${moduleName}.${key}`] = {
			type: this.modules[moduleName].uniformTypes?.[key],
			value: String(value)
		};
		return table;
	}
	_addModule(module) {
		const moduleName = module.name;
		this.moduleUniforms[moduleName] = mergeModuleUniforms({}, module.defaultUniforms || {}, module.uniformTypes);
		this.moduleBindings[moduleName] = {};
	}
};
function mergeModuleUniforms(currentUniforms = {}, nextUniforms = {}, uniformTypes = {}) {
	const mergedUniforms = { ...currentUniforms };
	for (const [key, value] of Object.entries(nextUniforms)) if (value !== void 0) mergedUniforms[key] = mergeModuleUniformValue(currentUniforms[key], value, uniformTypes[key]);
	return mergedUniforms;
}
function mergeModuleUniformValue(currentValue, nextValue, uniformType) {
	if (!uniformType || typeof uniformType === "string") return cloneModuleUniformValue(nextValue);
	if (Array.isArray(uniformType)) {
		if (isPackedUniformArrayValue(nextValue) || !Array.isArray(nextValue)) return cloneModuleUniformValue(nextValue);
		const currentArray = Array.isArray(currentValue) && !isPackedUniformArrayValue(currentValue) ? [...currentValue] : [];
		const mergedArray = currentArray.slice();
		for (let index = 0; index < nextValue.length; index++) {
			const elementValue = nextValue[index];
			if (elementValue !== void 0) mergedArray[index] = mergeModuleUniformValue(currentArray[index], elementValue, uniformType[0]);
		}
		return mergedArray;
	}
	if (!isPlainUniformObject(nextValue)) return cloneModuleUniformValue(nextValue);
	const uniformStruct = uniformType;
	const currentObject = isPlainUniformObject(currentValue) ? currentValue : {};
	const mergedObject = { ...currentObject };
	for (const [key, value] of Object.entries(nextValue)) if (value !== void 0) mergedObject[key] = mergeModuleUniformValue(currentObject[key], value, uniformStruct[key]);
	return mergedObject;
}
function cloneModuleUniformValue(value) {
	if (ArrayBuffer.isView(value)) return Array.prototype.slice.call(value);
	if (Array.isArray(value)) {
		if (isPackedUniformArrayValue(value)) return value.slice();
		return value.map((element) => element === void 0 ? void 0 : cloneModuleUniformValue(element));
	}
	if (isPlainUniformObject(value)) return Object.fromEntries(Object.entries(value).map(([key, nestedValue]) => [key, nestedValue === void 0 ? void 0 : cloneModuleUniformValue(nestedValue)]));
	return value;
}
function isPackedUniformArrayValue(value) {
	return ArrayBuffer.isView(value) || Array.isArray(value) && (value.length === 0 || typeof value[0] === "number");
}
function isPlainUniformObject(value) {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value) && !ArrayBuffer.isView(value);
}
function isShaderInputsModuleWithDependencies(module) {
	return Boolean(module?.dependencies);
}
//#endregion
//#region node_modules/@luma.gl/engine/dist/dynamic-texture/texture-data.js
/** Map of cube texture face names to face indexes */
var TEXTURE_CUBE_FACE_MAP = {
	"+X": 0,
	"-X": 1,
	"+Y": 2,
	"-Y": 3,
	"+Z": 4,
	"-Z": 5
};
function getFirstMipLevel(layer) {
	if (!layer) return null;
	return Array.isArray(layer) ? layer[0] ?? null : layer;
}
function getTextureSizeFromData(props) {
	const { dimension, data } = props;
	if (!data) return null;
	switch (dimension) {
		case "1d": {
			const mipLevel = getFirstMipLevel(data);
			if (!mipLevel) return null;
			const { width } = getTextureMipLevelSize(mipLevel);
			return {
				width,
				height: 1
			};
		}
		case "2d": {
			const mipLevel = getFirstMipLevel(data);
			return mipLevel ? getTextureMipLevelSize(mipLevel) : null;
		}
		case "3d":
		case "2d-array": {
			if (!Array.isArray(data) || data.length === 0) return null;
			const mipLevel = getFirstMipLevel(data[0]);
			return mipLevel ? getTextureMipLevelSize(mipLevel) : null;
		}
		case "cube": {
			const face = Object.keys(data)[0] ?? null;
			if (!face) return null;
			const faceData = data[face];
			const mipLevel = getFirstMipLevel(faceData);
			return mipLevel ? getTextureMipLevelSize(mipLevel) : null;
		}
		case "cube-array": {
			if (!Array.isArray(data) || data.length === 0) return null;
			const firstCube = data[0];
			const face = Object.keys(firstCube)[0] ?? null;
			if (!face) return null;
			const mipLevel = getFirstMipLevel(firstCube[face]);
			return mipLevel ? getTextureMipLevelSize(mipLevel) : null;
		}
		default: return null;
	}
}
function getTextureMipLevelSize(data) {
	if (isExternalImage(data)) return getExternalImageSize(data);
	if (typeof data === "object" && "width" in data && "height" in data) return {
		width: data.width,
		height: data.height
	};
	throw new Error("Unsupported mip-level data");
}
/** Type guard: is a mip-level `TextureImageData` (vs ExternalImage or bare typed array) */
function isTextureImageData(data) {
	return typeof data === "object" && data !== null && "data" in data && "width" in data && "height" in data;
}
function isTypedArrayMipLevelData(data) {
	return ArrayBuffer.isView(data);
}
function resolveTextureImageFormat(data) {
	const { textureFormat, format } = data;
	if (textureFormat && format && textureFormat !== format) throw new Error(`Conflicting texture formats "${textureFormat}" and "${format}" provided for the same mip level`);
	return textureFormat ?? format;
}
/** Resolve size for a single mip-level datum */
/** Convert cube face label to depth index */
function getCubeFaceIndex(face) {
	const idx = TEXTURE_CUBE_FACE_MAP[face];
	if (idx === void 0) throw new Error(`Invalid cube face: ${face}`);
	return idx;
}
/** Convert cube face label to texture slice index. Index can be used with `setTexture2DData()`. */
function getCubeArrayFaceIndex(cubeIndex, face) {
	return 6 * cubeIndex + getCubeFaceIndex(face);
}
/** Experimental: Set multiple mip levels (1D) */
function getTexture1DSubresources(data) {
	throw new Error("setTexture1DData not supported in WebGL.");
}
/** Normalize 2D layer payload into an array of mip-level items */
function _normalizeTexture2DData(data) {
	return Array.isArray(data) ? data : [data];
}
/** Experimental: Set multiple mip levels (2D), optionally at `z` (depth/array index) */
function getTexture2DSubresources(slice, lodData, baseLevelSize, textureFormat) {
	const lodArray = _normalizeTexture2DData(lodData);
	const z = slice;
	const subresources = [];
	for (let mipLevel = 0; mipLevel < lodArray.length; mipLevel++) {
		const imageData = lodArray[mipLevel];
		if (isExternalImage(imageData)) subresources.push({
			type: "external-image",
			image: imageData,
			z,
			mipLevel
		});
		else if (isTextureImageData(imageData)) subresources.push({
			type: "texture-data",
			data: imageData,
			textureFormat: resolveTextureImageFormat(imageData),
			z,
			mipLevel
		});
		else if (isTypedArrayMipLevelData(imageData) && baseLevelSize) subresources.push({
			type: "texture-data",
			data: {
				data: imageData,
				width: Math.max(1, baseLevelSize.width >> mipLevel),
				height: Math.max(1, baseLevelSize.height >> mipLevel),
				...textureFormat ? { format: textureFormat } : {}
			},
			textureFormat,
			z,
			mipLevel
		});
		else throw new Error("Unsupported 2D mip-level payload");
	}
	return subresources;
}
/** 3D: multiple depth slices, each may carry multiple mip levels */
function getTexture3DSubresources(data) {
	const subresources = [];
	for (let depth = 0; depth < data.length; depth++) subresources.push(...getTexture2DSubresources(depth, data[depth]));
	return subresources;
}
/** 2D array: multiple layers, each may carry multiple mip levels */
function getTextureArraySubresources(data) {
	const subresources = [];
	for (let layer = 0; layer < data.length; layer++) subresources.push(...getTexture2DSubresources(layer, data[layer]));
	return subresources;
}
/** Cube: 6 faces, each may carry multiple mip levels */
function getTextureCubeSubresources(data) {
	const subresources = [];
	for (const [face, faceData] of Object.entries(data)) {
		const faceDepth = getCubeFaceIndex(face);
		subresources.push(...getTexture2DSubresources(faceDepth, faceData));
	}
	return subresources;
}
/** Cube array: multiple cubes (faces×layers), each face may carry multiple mips */
function getTextureCubeArraySubresources(data) {
	const subresources = [];
	data.forEach((cubeData, cubeIndex) => {
		for (const [face, faceData] of Object.entries(cubeData)) {
			const faceDepth = getCubeArrayFaceIndex(cubeIndex, face);
			subresources.push(...getTexture2DSubresources(faceDepth, faceData));
		}
	});
	return subresources;
}
//#endregion
//#region node_modules/@luma.gl/engine/dist/dynamic-texture/dynamic-texture.js
/**
* Dynamic Textures
*
* - Mipmaps - DynamicTexture can generate mipmaps for textures (WebGPU does not provide built-in mipmap generation).
*
* - Texture initialization and updates - complex textures (2d array textures, cube textures, 3d textures) need multiple images
*   `DynamicTexture` provides an API that makes it easy to provide the required data.
*
* - Texture resizing - Textures are immutable in WebGPU, meaning that they cannot be resized after creation.
*   DynamicTexture provides a `resize()` method that internally creates a new texture with the same parameters
*   but a different size.
*
* - Async image data initialization - It is often very convenient to be able to initialize textures with promises
*   returned by image or data loading functions, as it allows a callback-free linear style of programming.
*
* @note GPU Textures are quite complex objects, with many subresources and modes of usage.
* The `DynamicTexture` class allows luma.gl to provide some support for working with textures
* without accumulating excessive complexity in the core Texture class which is designed as an immutable nature of GPU resource.
*/
var DynamicTexture = class DynamicTexture {
	device;
	id;
	/** Props with defaults resolved (except `data` which is processed separately) */
	props;
	/** Created resources */
	_texture = null;
	_sampler = null;
	_view = null;
	/** Ready when GPU texture has been created and data (if any) uploaded */
	ready;
	isReady = false;
	destroyed = false;
	resolveReady = () => {};
	rejectReady = () => {};
	get texture() {
		if (!this._texture) throw new Error("Texture not initialized yet");
		return this._texture;
	}
	get sampler() {
		if (!this._sampler) throw new Error("Sampler not initialized yet");
		return this._sampler;
	}
	get view() {
		if (!this._view) throw new Error("View not initialized yet");
		return this._view;
	}
	get [Symbol.toStringTag]() {
		return "DynamicTexture";
	}
	toString() {
		const width = this._texture?.width ?? this.props.width ?? "?";
		const height = this._texture?.height ?? this.props.height ?? "?";
		return `DynamicTexture:"${this.id}":${width}x${height}px:(${this.isReady ? "ready" : "loading..."})`;
	}
	constructor(device, props) {
		this.device = device;
		const id = uid("dynamic-texture");
		const originalPropsWithAsyncData = props;
		this.props = {
			...DynamicTexture.defaultProps,
			id,
			...props,
			data: null
		};
		this.id = this.props.id;
		this.ready = new Promise((resolve, reject) => {
			this.resolveReady = resolve;
			this.rejectReady = reject;
		});
		this.initAsync(originalPropsWithAsyncData);
	}
	/** @note Fire and forget; caller can await `ready` */
	async initAsync(originalPropsWithAsyncData) {
		try {
			const propsWithSyncData = await this._loadAllData(originalPropsWithAsyncData);
			this._checkNotDestroyed();
			const subresources = propsWithSyncData.data ? getTextureSubresources({
				...propsWithSyncData,
				width: originalPropsWithAsyncData.width,
				height: originalPropsWithAsyncData.height,
				format: originalPropsWithAsyncData.format
			}) : [];
			const userProvidedFormat = "format" in originalPropsWithAsyncData && originalPropsWithAsyncData.format !== void 0;
			const userProvidedUsage = "usage" in originalPropsWithAsyncData && originalPropsWithAsyncData.usage !== void 0;
			const deduceSize = () => {
				if (this.props.width && this.props.height) return {
					width: this.props.width,
					height: this.props.height
				};
				const size = getTextureSizeFromData(propsWithSyncData);
				if (size) return size;
				return {
					width: this.props.width || 1,
					height: this.props.height || 1
				};
			};
			const size = deduceSize();
			if (!size || size.width <= 0 || size.height <= 0) throw new Error(`${this} size could not be determined or was zero`);
			const textureData = analyzeTextureSubresources(this.device, subresources, size, { format: userProvidedFormat ? originalPropsWithAsyncData.format : void 0 });
			const resolvedFormat = textureData.format ?? this.props.format;
			const baseTextureProps = {
				...this.props,
				...size,
				format: resolvedFormat,
				mipLevels: 1,
				data: void 0
			};
			if (this.device.isTextureFormatCompressed(resolvedFormat) && !userProvidedUsage) baseTextureProps.usage = Texture.SAMPLE | Texture.COPY_DST;
			const shouldGenerateMipmaps = this.props.mipmaps && !textureData.hasExplicitMipChain && !this.device.isTextureFormatCompressed(resolvedFormat);
			if (this.device.type === "webgpu" && shouldGenerateMipmaps) {
				const requiredUsage = this.props.dimension === "3d" ? Texture.SAMPLE | Texture.STORAGE | Texture.COPY_DST | Texture.COPY_SRC : Texture.SAMPLE | Texture.RENDER | Texture.COPY_DST | Texture.COPY_SRC;
				baseTextureProps.usage |= requiredUsage;
			}
			const maxMips = this.device.getMipLevelCount(baseTextureProps.width, baseTextureProps.height);
			const desired = textureData.hasExplicitMipChain ? textureData.mipLevels : this.props.mipLevels === "auto" ? maxMips : Math.max(1, Math.min(maxMips, this.props.mipLevels ?? 1));
			const finalTextureProps = {
				...baseTextureProps,
				mipLevels: desired
			};
			this._texture = this.device.createTexture(finalTextureProps);
			this._sampler = this.texture.sampler;
			this._view = this.texture.view;
			if (textureData.subresources.length) this._setTextureSubresources(textureData.subresources);
			if (this.props.mipmaps && !textureData.hasExplicitMipChain && !shouldGenerateMipmaps) log.warn(`${this} skipping auto-generated mipmaps for compressed texture format`)();
			if (shouldGenerateMipmaps) this.generateMipmaps();
			this.isReady = true;
			this.resolveReady(this.texture);
			log.info(0, `${this} created`)();
		} catch (e) {
			const err = e instanceof Error ? e : new Error(String(e));
			this.rejectReady(err);
		}
	}
	destroy() {
		if (this._texture) {
			this._texture.destroy();
			this._texture = null;
			this._sampler = null;
			this._view = null;
		}
		this.destroyed = true;
	}
	generateMipmaps() {
		if (this.device.type === "webgl") this.texture.generateMipmapsWebGL();
		else if (this.device.type === "webgpu") this.device.generateMipmapsWebGPU(this.texture);
		else log.warn(`${this} mipmaps not supported on ${this.device.type}`);
	}
	/** Set sampler or create one from props */
	setSampler(sampler = {}) {
		this._checkReady();
		const s = sampler instanceof Sampler ? sampler : this.device.createSampler(sampler);
		this.texture.setSampler(s);
		this._sampler = s;
	}
	/**
	* Copies texture contents into a GPU buffer and waits until the copy is complete.
	* The caller owns the returned buffer and must destroy it when finished.
	*/
	async readBuffer(options = {}) {
		if (!this.isReady) await this.ready;
		const width = options.width ?? this.texture.width;
		const height = options.height ?? this.texture.height;
		const depthOrArrayLayers = options.depthOrArrayLayers ?? this.texture.depth;
		const layout = this.texture.computeMemoryLayout({
			width,
			height,
			depthOrArrayLayers
		});
		const buffer = this.device.createBuffer({
			byteLength: layout.byteLength,
			usage: Buffer.COPY_DST | Buffer.MAP_READ
		});
		this.texture.readBuffer({
			...options,
			width,
			height,
			depthOrArrayLayers
		}, buffer);
		const fence = this.device.createFence();
		await fence.signaled;
		fence.destroy();
		return buffer;
	}
	/** Reads texture contents back to CPU memory. */
	async readAsync(options = {}) {
		if (!this.isReady) await this.ready;
		const width = options.width ?? this.texture.width;
		const height = options.height ?? this.texture.height;
		const depthOrArrayLayers = options.depthOrArrayLayers ?? this.texture.depth;
		const layout = this.texture.computeMemoryLayout({
			width,
			height,
			depthOrArrayLayers
		});
		const buffer = await this.readBuffer(options);
		const data = await buffer.readAsync(0, layout.byteLength);
		buffer.destroy();
		return data.buffer;
	}
	/**
	* Resize by cloning the underlying immutable texture.
	* Does not copy contents; caller may need to re-upload and/or regenerate mips.
	*/
	resize(size) {
		this._checkReady();
		if (size.width === this.texture.width && size.height === this.texture.height) return false;
		const prev = this.texture;
		this._texture = prev.clone(size);
		this._sampler = this.texture.sampler;
		this._view = this.texture.view;
		prev.destroy();
		log.info(`${this} resized`);
		return true;
	}
	/** Convert cube face label to texture slice index. Index can be used with `setTexture2DData()`. */
	getCubeFaceIndex(face) {
		const index = TEXTURE_CUBE_FACE_MAP[face];
		if (index === void 0) throw new Error(`Invalid cube face: ${face}`);
		return index;
	}
	/** Convert cube face label to texture slice index. Index can be used with `setTexture2DData()`. */
	getCubeArrayFaceIndex(cubeIndex, face) {
		return 6 * cubeIndex + this.getCubeFaceIndex(face);
	}
	/** @note experimental: Set multiple mip levels (1D) */
	setTexture1DData(data) {
		this._checkReady();
		if (this.texture.props.dimension !== "1d") throw new Error(`${this} is not 1d`);
		const subresources = getTexture1DSubresources(data);
		this._setTextureSubresources(subresources);
	}
	/** @note experimental: Set multiple mip levels (2D), optionally at `z`, slice (depth/array level) index */
	setTexture2DData(lodData, z = 0) {
		this._checkReady();
		if (this.texture.props.dimension !== "2d") throw new Error(`${this} is not 2d`);
		const subresources = getTexture2DSubresources(z, lodData);
		this._setTextureSubresources(subresources);
	}
	/** 3D: multiple depth slices, each may carry multiple mip levels */
	setTexture3DData(data) {
		if (this.texture.props.dimension !== "3d") throw new Error(`${this} is not 3d`);
		const subresources = getTexture3DSubresources(data);
		this._setTextureSubresources(subresources);
	}
	/** 2D array: multiple layers, each may carry multiple mip levels */
	setTextureArrayData(data) {
		if (this.texture.props.dimension !== "2d-array") throw new Error(`${this} is not 2d-array`);
		const subresources = getTextureArraySubresources(data);
		this._setTextureSubresources(subresources);
	}
	/** Cube: 6 faces, each may carry multiple mip levels */
	setTextureCubeData(data) {
		if (this.texture.props.dimension !== "cube") throw new Error(`${this} is not cube`);
		const subresources = getTextureCubeSubresources(data);
		this._setTextureSubresources(subresources);
	}
	/** Cube array: multiple cubes (faces×layers), each face may carry multiple mips */
	setTextureCubeArrayData(data) {
		if (this.texture.props.dimension !== "cube-array") throw new Error(`${this} is not cube-array`);
		const subresources = getTextureCubeArraySubresources(data);
		this._setTextureSubresources(subresources);
	}
	/** Sets multiple mip levels on different `z` slices (depth/array index) */
	_setTextureSubresources(subresources) {
		for (const subresource of subresources) {
			const { z, mipLevel } = subresource;
			switch (subresource.type) {
				case "external-image":
					const { image, flipY } = subresource;
					this.texture.copyExternalImage({
						image,
						z,
						mipLevel,
						flipY
					});
					break;
				case "texture-data":
					const { data, textureFormat } = subresource;
					if (textureFormat && textureFormat !== this.texture.format) throw new Error(`${this} mip level ${mipLevel} uses format "${textureFormat}" but texture format is "${this.texture.format}"`);
					this.texture.writeData(data.data, {
						x: 0,
						y: 0,
						z,
						width: data.width,
						height: data.height,
						depthOrArrayLayers: 1,
						mipLevel
					});
					break;
				default: throw new Error("Unsupported 2D mip-level payload");
			}
		}
	}
	/** Recursively resolve all promises in data structures */
	async _loadAllData(props) {
		const syncData = await awaitAllPromises(props.data);
		return {
			dimension: props.dimension ?? "2d",
			data: syncData ?? null
		};
	}
	_checkNotDestroyed() {
		if (this.destroyed) log.warn(`${this} already destroyed`);
	}
	_checkReady() {
		if (!this.isReady) log.warn(`${this} Cannot perform this operation before ready`);
	}
	static defaultProps = {
		...Texture.defaultProps,
		dimension: "2d",
		data: null,
		mipmaps: false
	};
};
function getTextureSubresources(props) {
	if (!props.data) return [];
	const baseLevelSize = props.width && props.height ? {
		width: props.width,
		height: props.height
	} : void 0;
	const textureFormat = "format" in props ? props.format : void 0;
	switch (props.dimension) {
		case "1d": return getTexture1DSubresources(props.data);
		case "2d": return getTexture2DSubresources(0, props.data, baseLevelSize, textureFormat);
		case "3d": return getTexture3DSubresources(props.data);
		case "2d-array": return getTextureArraySubresources(props.data);
		case "cube": return getTextureCubeSubresources(props.data);
		case "cube-array": return getTextureCubeArraySubresources(props.data);
		default: throw new Error(`Unhandled dimension ${props.dimension}`);
	}
}
function analyzeTextureSubresources(device, subresources, size, options) {
	if (subresources.length === 0) return {
		subresources,
		mipLevels: 1,
		format: options.format,
		hasExplicitMipChain: false
	};
	const groupedSubresources = /* @__PURE__ */ new Map();
	for (const subresource of subresources) {
		const group = groupedSubresources.get(subresource.z) ?? [];
		group.push(subresource);
		groupedSubresources.set(subresource.z, group);
	}
	const hasExplicitMipChain = subresources.some((subresource) => subresource.mipLevel > 0);
	let resolvedFormat = options.format;
	let resolvedMipLevels = Number.POSITIVE_INFINITY;
	const validSubresources = [];
	for (const [z, sliceSubresources] of groupedSubresources) {
		const sortedSubresources = [...sliceSubresources].sort((left, right) => left.mipLevel - right.mipLevel);
		const baseLevel = sortedSubresources[0];
		if (!baseLevel || baseLevel.mipLevel !== 0) throw new Error(`DynamicTexture: slice ${z} is missing mip level 0`);
		const baseSize = getTextureSubresourceSize(device, baseLevel);
		if (baseSize.width !== size.width || baseSize.height !== size.height) throw new Error(`DynamicTexture: slice ${z} base level dimensions ${baseSize.width}x${baseSize.height} do not match expected ${size.width}x${size.height}`);
		const baseFormat = getTextureSubresourceFormat(baseLevel);
		if (baseFormat) {
			if (resolvedFormat && resolvedFormat !== baseFormat) throw new Error(`DynamicTexture: slice ${z} base level format "${baseFormat}" does not match texture format "${resolvedFormat}"`);
			resolvedFormat = baseFormat;
		}
		const mipLevelLimit = resolvedFormat && device.isTextureFormatCompressed(resolvedFormat) ? getMaxCompressedMipLevels(device, baseSize.width, baseSize.height, resolvedFormat) : device.getMipLevelCount(baseSize.width, baseSize.height);
		let validMipLevelsForSlice = 0;
		for (let expectedMipLevel = 0; expectedMipLevel < sortedSubresources.length; expectedMipLevel++) {
			const subresource = sortedSubresources[expectedMipLevel];
			if (!subresource || subresource.mipLevel !== expectedMipLevel) break;
			if (expectedMipLevel >= mipLevelLimit) break;
			const subresourceSize = getTextureSubresourceSize(device, subresource);
			const expectedWidth = Math.max(1, baseSize.width >> expectedMipLevel);
			const expectedHeight = Math.max(1, baseSize.height >> expectedMipLevel);
			if (subresourceSize.width !== expectedWidth || subresourceSize.height !== expectedHeight) break;
			const subresourceFormat = getTextureSubresourceFormat(subresource);
			if (subresourceFormat) {
				if (!resolvedFormat) resolvedFormat = subresourceFormat;
				if (subresourceFormat !== resolvedFormat) break;
			}
			validMipLevelsForSlice++;
			validSubresources.push(subresource);
		}
		resolvedMipLevels = Math.min(resolvedMipLevels, validMipLevelsForSlice);
	}
	const mipLevels = Number.isFinite(resolvedMipLevels) ? Math.max(1, resolvedMipLevels) : 1;
	return {
		subresources: validSubresources.filter((subresource) => subresource.mipLevel < mipLevels),
		mipLevels,
		format: resolvedFormat,
		hasExplicitMipChain
	};
}
function getTextureSubresourceFormat(subresource) {
	if (subresource.type !== "texture-data") return;
	return subresource.textureFormat ?? resolveTextureImageFormat(subresource.data);
}
function getTextureSubresourceSize(device, subresource) {
	switch (subresource.type) {
		case "external-image": return device.getExternalImageSize(subresource.image);
		case "texture-data": return {
			width: subresource.data.width,
			height: subresource.data.height
		};
		default: throw new Error("Unsupported texture subresource");
	}
}
function getMaxCompressedMipLevels(device, baseWidth, baseHeight, format) {
	const { blockWidth = 1, blockHeight = 1 } = device.getTextureFormatInfo(format);
	let mipLevels = 1;
	for (let mipLevel = 1;; mipLevel++) {
		const width = Math.max(1, baseWidth >> mipLevel);
		const height = Math.max(1, baseHeight >> mipLevel);
		if (width < blockWidth || height < blockHeight) break;
		mipLevels++;
	}
	return mipLevels;
}
/** Resolve all promises in a nested data structure */
async function awaitAllPromises(x) {
	x = await x;
	if (Array.isArray(x)) return await Promise.all(x.map(awaitAllPromises));
	if (x && typeof x === "object" && x.constructor === Object) {
		const object = x;
		const values = await Promise.all(Object.values(object).map(awaitAllPromises));
		const keys = Object.keys(object);
		const resolvedObject = {};
		for (let i = 0; i < keys.length; i++) resolvedObject[keys[i]] = values[i];
		return resolvedObject;
	}
	return x;
}
//#endregion
//#region node_modules/@luma.gl/engine/dist/model/model.js
var LOG_DRAW_PRIORITY = 2;
var LOG_DRAW_TIMEOUT = 1e4;
var PIPELINE_INITIALIZATION_FAILED = "render pipeline initialization failed";
/**
* High level draw API for luma.gl.
*
* A `Model` encapsulates shaders, geometry attributes, bindings and render
* pipeline state into a single object. It automatically reuses and rebuilds
* pipelines as render parameters change and exposes convenient hooks for
* updating uniforms and attributes.
*
* Features:
* - Reuses and lazily recompiles {@link RenderPipeline | pipelines} as needed.
* - Integrates with `@luma.gl/shadertools` to assemble GLSL or WGSL from shader modules.
* - Manages geometry attributes and buffer bindings.
* - Accepts textures, samplers and uniform buffers as bindings, including `DynamicTexture`.
* - Provides detailed debug logging and optional shader source inspection.
*/
var Model = class Model {
	static defaultProps = {
		...RenderPipeline.defaultProps,
		source: void 0,
		vs: null,
		fs: null,
		id: "unnamed",
		handle: void 0,
		userData: {},
		defines: {},
		modules: [],
		geometry: null,
		indexBuffer: null,
		attributes: {},
		constantAttributes: {},
		bindings: {},
		uniforms: {},
		varyings: [],
		isInstanced: void 0,
		instanceCount: 0,
		vertexCount: 0,
		shaderInputs: void 0,
		material: void 0,
		pipelineFactory: void 0,
		shaderFactory: void 0,
		transformFeedback: void 0,
		shaderAssembler: ShaderAssembler.getDefaultShaderAssembler(),
		debugShaders: void 0,
		disableWarnings: void 0
	};
	/** Device that created this model */
	device;
	/** Application provided identifier */
	id;
	/** WGSL shader source when using unified shader */
	source;
	/** GLSL vertex shader source */
	vs;
	/** GLSL fragment shader source */
	fs;
	/** Factory used to create render pipelines */
	pipelineFactory;
	/** Factory used to create shaders */
	shaderFactory;
	/** User-supplied per-model data */
	userData = {};
	/** The render pipeline GPU parameters, depth testing etc */
	parameters;
	/** The primitive topology */
	topology;
	/** Buffer layout */
	bufferLayout;
	/** Use instanced rendering */
	isInstanced = void 0;
	/** instance count. `undefined` means not instanced */
	instanceCount = 0;
	/** Vertex count */
	vertexCount;
	/** Index buffer */
	indexBuffer = null;
	/** Buffer-valued attributes */
	bufferAttributes = {};
	/** Constant-valued attributes */
	constantAttributes = {};
	/** Bindings (textures, samplers, uniform buffers) */
	bindings = {};
	/**
	* VertexArray
	* @note not implemented: if bufferLayout is updated, vertex array has to be rebuilt!
	* @todo - allow application to define multiple vertex arrays?
	* */
	vertexArray;
	/** TransformFeedback, WebGL 2 only. */
	transformFeedback = null;
	/** The underlying GPU "program". @note May be recreated if parameters change */
	pipeline;
	/** ShaderInputs instance */
	shaderInputs;
	material = null;
	_uniformStore;
	_attributeInfos = {};
	_gpuGeometry = null;
	props;
	_pipelineNeedsUpdate = "newly created";
	_needsRedraw = "initializing";
	_destroyed = false;
	/** "Time" of last draw. Monotonically increasing timestamp */
	_lastDrawTimestamp = -1;
	_bindingTable = [];
	get [Symbol.toStringTag]() {
		return "Model";
	}
	toString() {
		return `Model(${this.id})`;
	}
	constructor(device, props) {
		this.props = {
			...Model.defaultProps,
			...props
		};
		props = this.props;
		this.id = props.id || uid("model");
		this.device = device;
		Object.assign(this.userData, props.userData);
		this.material = props.material || null;
		const moduleMap = Object.fromEntries(this.props.modules?.map((module) => [module.name, module]) || []);
		const shaderInputs = props.shaderInputs || new ShaderInputs(moduleMap, { disableWarnings: this.props.disableWarnings });
		this.setShaderInputs(shaderInputs);
		const platformInfo = getPlatformInfo(device);
		const modules = (this.props.modules?.length > 0 ? this.props.modules : this.shaderInputs?.getModules()) || [];
		this.props.shaderLayout = mergeShaderModuleBindingsIntoLayout(this.props.shaderLayout, modules) || null;
		if (this.device.type === "webgpu" && this.props.source) {
			const { source, getUniforms, bindingTable } = this.props.shaderAssembler.assembleWGSLShader({
				platformInfo,
				...this.props,
				modules
			});
			this.source = source;
			this._getModuleUniforms = getUniforms;
			this._bindingTable = bindingTable;
			const inferredShaderLayout = device.getShaderLayout?.(this.source);
			this.props.shaderLayout = mergeShaderModuleBindingsIntoLayout(this.props.shaderLayout || inferredShaderLayout || null, modules) || null;
		} else {
			const { vs, fs, getUniforms } = this.props.shaderAssembler.assembleGLSLShaderPair({
				platformInfo,
				...this.props,
				modules
			});
			this.vs = vs;
			this.fs = fs;
			this._getModuleUniforms = getUniforms;
			this._bindingTable = [];
		}
		this.vertexCount = this.props.vertexCount;
		this.instanceCount = this.props.instanceCount;
		this.topology = this.props.topology;
		this.bufferLayout = this.props.bufferLayout;
		this.parameters = this.props.parameters;
		if (props.geometry) this.setGeometry(props.geometry);
		this.pipelineFactory = props.pipelineFactory || PipelineFactory.getDefaultPipelineFactory(this.device);
		this.shaderFactory = props.shaderFactory || ShaderFactory.getDefaultShaderFactory(this.device);
		this.pipeline = this._updatePipeline();
		this.vertexArray = device.createVertexArray({
			shaderLayout: this.pipeline.shaderLayout,
			bufferLayout: this.pipeline.bufferLayout
		});
		if (this._gpuGeometry) this._setGeometryAttributes(this._gpuGeometry);
		if ("isInstanced" in props) this.isInstanced = props.isInstanced;
		if (props.instanceCount) this.setInstanceCount(props.instanceCount);
		if (props.vertexCount) this.setVertexCount(props.vertexCount);
		if (props.indexBuffer) this.setIndexBuffer(props.indexBuffer);
		if (props.attributes) this.setAttributes(props.attributes);
		if (props.constantAttributes) this.setConstantAttributes(props.constantAttributes);
		if (props.bindings) this.setBindings(props.bindings);
		if (props.transformFeedback) this.transformFeedback = props.transformFeedback;
	}
	destroy() {
		if (!this._destroyed) {
			this.pipelineFactory.release(this.pipeline);
			this.shaderFactory.release(this.pipeline.vs);
			if (this.pipeline.fs && this.pipeline.fs !== this.pipeline.vs) this.shaderFactory.release(this.pipeline.fs);
			this._uniformStore.destroy();
			this._gpuGeometry?.destroy();
			this._destroyed = true;
		}
	}
	/** Query redraw status. Clears the status. */
	needsRedraw() {
		if (this._getBindingsUpdateTimestamp() > this._lastDrawTimestamp) this.setNeedsRedraw("contents of bound textures or buffers updated");
		const needsRedraw = this._needsRedraw;
		this._needsRedraw = false;
		return needsRedraw;
	}
	/** Mark the model as needing a redraw */
	setNeedsRedraw(reason) {
		this._needsRedraw ||= reason;
	}
	/** Returns WGSL binding debug rows for the assembled shader. Returns an empty array for GLSL models. */
	getBindingDebugTable() {
		return this._bindingTable;
	}
	/** Update uniforms and pipeline state prior to drawing. */
	predraw() {
		this.updateShaderInputs();
		this.pipeline = this._updatePipeline();
	}
	/**
	* Issue one draw call.
	* @param renderPass - render pass to draw into
	* @returns `true` if the draw call was executed, `false` if resources were not ready.
	*/
	draw(renderPass) {
		const loadingBinding = this._areBindingsLoading();
		if (loadingBinding) {
			log.info(LOG_DRAW_PRIORITY, `>>> DRAWING ABORTED ${this.id}: ${loadingBinding} not loaded`)();
			return false;
		}
		try {
			renderPass.pushDebugGroup(`${this}.predraw(${renderPass})`);
			this.predraw();
		} finally {
			renderPass.popDebugGroup();
		}
		let drawSuccess;
		let pipelineErrored = this.pipeline.isErrored;
		try {
			renderPass.pushDebugGroup(`${this}.draw(${renderPass})`);
			this._logDrawCallStart();
			this.pipeline = this._updatePipeline();
			pipelineErrored = this.pipeline.isErrored;
			if (pipelineErrored) {
				log.info(LOG_DRAW_PRIORITY, `>>> DRAWING ABORTED ${this.id}: ${PIPELINE_INITIALIZATION_FAILED}`)();
				drawSuccess = false;
			} else {
				const syncBindings = this._getBindings();
				const syncBindGroups = this._getBindGroups();
				const { indexBuffer } = this.vertexArray;
				const indexCount = indexBuffer ? indexBuffer.byteLength / (indexBuffer.indexType === "uint32" ? 4 : 2) : void 0;
				drawSuccess = this.pipeline.draw({
					renderPass,
					vertexArray: this.vertexArray,
					isInstanced: this.isInstanced,
					vertexCount: this.vertexCount,
					instanceCount: this.instanceCount,
					indexCount,
					transformFeedback: this.transformFeedback || void 0,
					bindings: syncBindings,
					bindGroups: syncBindGroups,
					_bindGroupCacheKeys: this._getBindGroupCacheKeys(),
					uniforms: this.props.uniforms,
					parameters: this.parameters,
					topology: this.topology
				});
			}
		} finally {
			renderPass.popDebugGroup();
			this._logDrawCallEnd();
		}
		this._logFramebuffer(renderPass);
		if (drawSuccess) {
			this._lastDrawTimestamp = this.device.timestamp;
			this._needsRedraw = false;
		} else if (pipelineErrored) this._needsRedraw = PIPELINE_INITIALIZATION_FAILED;
		else this._needsRedraw = "waiting for resource initialization";
		return drawSuccess;
	}
	/**
	* Updates the optional geometry
	* Geometry, set topology and bufferLayout
	* @note Can trigger a pipeline rebuild / pipeline cache fetch on WebGPU
	*/
	setGeometry(geometry) {
		this._gpuGeometry?.destroy();
		const gpuGeometry = geometry && makeGPUGeometry(this.device, geometry);
		if (gpuGeometry) {
			this.setTopology(gpuGeometry.topology || "triangle-list");
			const bufferLayoutHelper = new BufferLayoutHelper(this.bufferLayout);
			this.bufferLayout = bufferLayoutHelper.mergeBufferLayouts(gpuGeometry.bufferLayout, this.bufferLayout);
			if (this.vertexArray) this._setGeometryAttributes(gpuGeometry);
		}
		this._gpuGeometry = gpuGeometry;
	}
	/**
	* Updates the primitive topology ('triangle-list', 'triangle-strip' etc).
	* @note Triggers a pipeline rebuild / pipeline cache fetch on WebGPU
	*/
	setTopology(topology) {
		if (topology !== this.topology) {
			this.topology = topology;
			this._setPipelineNeedsUpdate("topology");
		}
	}
	/**
	* Updates the buffer layout.
	* @note Triggers a pipeline rebuild / pipeline cache fetch
	*/
	setBufferLayout(bufferLayout) {
		const bufferLayoutHelper = new BufferLayoutHelper(this.bufferLayout);
		this.bufferLayout = this._gpuGeometry ? bufferLayoutHelper.mergeBufferLayouts(bufferLayout, this._gpuGeometry.bufferLayout) : bufferLayout;
		this._setPipelineNeedsUpdate("bufferLayout");
		this.pipeline = this._updatePipeline();
		this.vertexArray = this.device.createVertexArray({
			shaderLayout: this.pipeline.shaderLayout,
			bufferLayout: this.pipeline.bufferLayout
		});
		if (this._gpuGeometry) this._setGeometryAttributes(this._gpuGeometry);
	}
	/**
	* Set GPU parameters.
	* @note Can trigger a pipeline rebuild / pipeline cache fetch.
	* @param parameters
	*/
	setParameters(parameters) {
		if (!deepEqual$1(parameters, this.parameters, 2)) {
			this.parameters = parameters;
			this._setPipelineNeedsUpdate("parameters");
		}
	}
	/**
	* Updates the instance count (used in draw calls)
	* @note Any attributes with stepMode=instance need to be at least this big
	*/
	setInstanceCount(instanceCount) {
		this.instanceCount = instanceCount;
		if (this.isInstanced === void 0 && instanceCount > 0) this.isInstanced = true;
		this.setNeedsRedraw("instanceCount");
	}
	/**
	* Updates the vertex count (used in draw calls)
	* @note Any attributes with stepMode=vertex need to be at least this big
	*/
	setVertexCount(vertexCount) {
		this.vertexCount = vertexCount;
		this.setNeedsRedraw("vertexCount");
	}
	/** Set the shader inputs */
	setShaderInputs(shaderInputs) {
		this.shaderInputs = shaderInputs;
		this._uniformStore = new UniformStore(this.device, this.shaderInputs.modules);
		for (const [moduleName, module] of Object.entries(this.shaderInputs.modules)) if (shaderModuleHasUniforms(module) && !this.material?.ownsModule(moduleName)) {
			const uniformBuffer = this._uniformStore.getManagedUniformBuffer(moduleName);
			this.bindings[`${moduleName}Uniforms`] = uniformBuffer;
		}
		this.setNeedsRedraw("shaderInputs");
	}
	setMaterial(material) {
		this.material = material;
		this.setNeedsRedraw("material");
	}
	/** Update uniform buffers from the model's shader inputs */
	updateShaderInputs() {
		this._uniformStore.setUniforms(this.shaderInputs.getUniformValues());
		this.setBindings(this._getNonMaterialBindings(this.shaderInputs.getBindingValues()));
		this.setNeedsRedraw("shaderInputs");
	}
	/**
	* Sets bindings (textures, samplers, uniform buffers)
	*/
	setBindings(bindings) {
		Object.assign(this.bindings, bindings);
		this.setNeedsRedraw("bindings");
	}
	/**
	* Updates optional transform feedback. WebGL only.
	*/
	setTransformFeedback(transformFeedback) {
		this.transformFeedback = transformFeedback;
		this.setNeedsRedraw("transformFeedback");
	}
	/**
	* Sets the index buffer
	* @todo - how to unset it if we change geometry?
	*/
	setIndexBuffer(indexBuffer) {
		this.vertexArray.setIndexBuffer(indexBuffer);
		this.setNeedsRedraw("indexBuffer");
	}
	/**
	* Sets attributes (buffers)
	* @note Overrides any attributes previously set with the same name
	*/
	setAttributes(buffers, options) {
		const disableWarnings = options?.disableWarnings ?? this.props.disableWarnings;
		if (buffers["indices"]) log.warn(`Model:${this.id} setAttributes() - indexBuffer should be set using setIndexBuffer()`)();
		this.bufferLayout = sortedBufferLayoutByShaderSourceLocations(this.pipeline.shaderLayout, this.bufferLayout);
		const bufferLayoutHelper = new BufferLayoutHelper(this.bufferLayout);
		for (const [bufferName, buffer] of Object.entries(buffers)) {
			const bufferLayout = bufferLayoutHelper.getBufferLayout(bufferName);
			if (!bufferLayout) {
				if (!disableWarnings) log.warn(`Model(${this.id}): Missing layout for buffer "${bufferName}".`)();
				continue;
			}
			const attributeNames = bufferLayoutHelper.getAttributeNamesForBuffer(bufferLayout);
			let set = false;
			for (const attributeName of attributeNames) {
				const attributeInfo = this._attributeInfos[attributeName];
				if (attributeInfo) {
					const location = this.device.type === "webgpu" ? bufferLayoutHelper.getBufferIndex(attributeInfo.bufferName) : attributeInfo.location;
					this.vertexArray.setBuffer(location, buffer);
					set = true;
				}
			}
			if (!set && !disableWarnings) log.warn(`Model(${this.id}): Ignoring buffer "${buffer.id}" for unknown attribute "${bufferName}"`)();
		}
		this.setNeedsRedraw("attributes");
	}
	/**
	* Sets constant attributes
	* @note Overrides any attributes previously set with the same name
	* Constant attributes are only supported in WebGL, not in WebGPU
	* Any attribute that is disabled in the current vertex array object
	* is read from the context's global constant value for that attribute location.
	* @param constantAttributes
	*/
	setConstantAttributes(attributes, options) {
		for (const [attributeName, value] of Object.entries(attributes)) {
			const attributeInfo = this._attributeInfos[attributeName];
			if (attributeInfo) this.vertexArray.setConstantWebGL(attributeInfo.location, value);
			else if (!(options?.disableWarnings ?? this.props.disableWarnings)) log.warn(`Model "${this.id}: Ignoring constant supplied for unknown attribute "${attributeName}"`)();
		}
		this.setNeedsRedraw("constants");
	}
	/** Check that bindings are loaded. Returns id of first binding that is still loading. */
	_areBindingsLoading() {
		for (const binding of Object.values(this.bindings)) if (binding instanceof DynamicTexture && !binding.isReady) return binding.id;
		for (const binding of Object.values(this.material?.bindings || {})) if (binding instanceof DynamicTexture && !binding.isReady) return binding.id;
		return false;
	}
	/** Extracts texture view from loaded async textures. Returns null if any textures have not yet been loaded. */
	_getBindings() {
		const validBindings = {};
		for (const [name, binding] of Object.entries(this.bindings)) if (binding instanceof DynamicTexture) {
			if (binding.isReady) validBindings[name] = binding.texture;
		} else validBindings[name] = binding;
		return validBindings;
	}
	_getBindGroups() {
		const shaderLayout = this.pipeline?.shaderLayout || this.props.shaderLayout || { bindings: [] };
		const bindGroups = shaderLayout.bindings.length ? normalizeBindingsByGroup(shaderLayout, this._getBindings()) : { 0: this._getBindings() };
		if (!this.material) return bindGroups;
		for (const [groupKey, groupBindings] of Object.entries(this.material.getBindingsByGroup())) {
			const group = Number(groupKey);
			bindGroups[group] = {
				...bindGroups[group] || {},
				...groupBindings
			};
		}
		return bindGroups;
	}
	_getBindGroupCacheKeys() {
		const bindGroupCacheKey = this.material?.getBindGroupCacheKey(3);
		return bindGroupCacheKey ? { 3: bindGroupCacheKey } : {};
	}
	/** Get the timestamp of the latest updated bound GPU memory resource (buffer/texture). */
	_getBindingsUpdateTimestamp() {
		let timestamp = 0;
		for (const binding of Object.values(this.bindings)) if (binding instanceof TextureView) timestamp = Math.max(timestamp, binding.texture.updateTimestamp);
		else if (binding instanceof Buffer || binding instanceof Texture) timestamp = Math.max(timestamp, binding.updateTimestamp);
		else if (binding instanceof DynamicTexture) timestamp = binding.texture ? Math.max(timestamp, binding.texture.updateTimestamp) : Infinity;
		else if (!(binding instanceof Sampler)) timestamp = Math.max(timestamp, binding.buffer.updateTimestamp);
		return Math.max(timestamp, this.material?.getBindingsUpdateTimestamp() || 0);
	}
	/**
	* Updates the optional geometry attributes
	* Geometry, sets several attributes, indexBuffer, and also vertex count
	* @note Can trigger a pipeline rebuild / pipeline cache fetch on WebGPU
	*/
	_setGeometryAttributes(gpuGeometry) {
		const attributes = { ...gpuGeometry.attributes };
		for (const [attributeName] of Object.entries(attributes)) if (!this.pipeline.shaderLayout.attributes.find((layout) => layout.name === attributeName) && attributeName !== "positions") delete attributes[attributeName];
		this.vertexCount = gpuGeometry.vertexCount;
		this.setIndexBuffer(gpuGeometry.indices || null);
		this.setAttributes(gpuGeometry.attributes, { disableWarnings: true });
		this.setAttributes(attributes, { disableWarnings: this.props.disableWarnings });
		this.setNeedsRedraw("geometry attributes");
	}
	/** Mark pipeline as needing update */
	_setPipelineNeedsUpdate(reason) {
		this._pipelineNeedsUpdate ||= reason;
		this.setNeedsRedraw(reason);
	}
	/** Update pipeline if needed */
	_updatePipeline() {
		if (this._pipelineNeedsUpdate) {
			let prevShaderVs = null;
			let prevShaderFs = null;
			if (this.pipeline) {
				log.log(1, `Model ${this.id}: Recreating pipeline because "${this._pipelineNeedsUpdate}".`)();
				prevShaderVs = this.pipeline.vs;
				prevShaderFs = this.pipeline.fs;
			}
			this._pipelineNeedsUpdate = false;
			const vs = this.shaderFactory.createShader({
				id: `${this.id}-vertex`,
				stage: "vertex",
				source: this.source || this.vs,
				debugShaders: this.props.debugShaders
			});
			let fs = null;
			if (this.source) fs = vs;
			else if (this.fs) fs = this.shaderFactory.createShader({
				id: `${this.id}-fragment`,
				stage: "fragment",
				source: this.source || this.fs,
				debugShaders: this.props.debugShaders
			});
			this.pipeline = this.pipelineFactory.createRenderPipeline({
				...this.props,
				bindings: void 0,
				bufferLayout: this.bufferLayout,
				topology: this.topology,
				parameters: this.parameters,
				bindGroups: this._getBindGroups(),
				vs,
				fs
			});
			this._attributeInfos = getAttributeInfosFromLayouts(this.pipeline.shaderLayout, this.bufferLayout);
			if (prevShaderVs) this.shaderFactory.release(prevShaderVs);
			if (prevShaderFs && prevShaderFs !== prevShaderVs) this.shaderFactory.release(prevShaderFs);
		}
		return this.pipeline;
	}
	/** Throttle draw call logging */
	_lastLogTime = 0;
	_logOpen = false;
	_logDrawCallStart() {
		const logDrawTimeout = log.level > 3 ? 0 : LOG_DRAW_TIMEOUT;
		if (log.level < 2 || Date.now() - this._lastLogTime < logDrawTimeout) return;
		this._lastLogTime = Date.now();
		this._logOpen = true;
		log.group(LOG_DRAW_PRIORITY, `>>> DRAWING MODEL ${this.id}`, { collapsed: log.level <= 2 })();
	}
	_logDrawCallEnd() {
		if (this._logOpen) {
			const shaderLayoutTable = getDebugTableForShaderLayout(this.pipeline.shaderLayout, this.id);
			log.table(LOG_DRAW_PRIORITY, shaderLayoutTable)();
			const uniformTable = this.shaderInputs.getDebugTable();
			log.table(LOG_DRAW_PRIORITY, uniformTable)();
			const attributeTable = this._getAttributeDebugTable();
			log.table(LOG_DRAW_PRIORITY, this._attributeInfos)();
			log.table(LOG_DRAW_PRIORITY, attributeTable)();
			log.groupEnd(LOG_DRAW_PRIORITY)();
			this._logOpen = false;
		}
	}
	_drawCount = 0;
	_logFramebuffer(renderPass) {
		const debugFramebuffers = this.device.props.debugFramebuffers;
		this._drawCount++;
		if (!debugFramebuffers) return;
		const framebuffer = renderPass.props.framebuffer;
		debugFramebuffer(renderPass, framebuffer, {
			id: framebuffer?.id || `${this.id}-framebuffer`,
			minimap: true
		});
	}
	_getAttributeDebugTable() {
		const table = {};
		for (const [name, attributeInfo] of Object.entries(this._attributeInfos)) {
			const values = this.vertexArray.attributes[attributeInfo.location];
			table[attributeInfo.location] = {
				name,
				type: attributeInfo.shaderType,
				values: values ? this._getBufferOrConstantValues(values, attributeInfo.bufferDataType) : "null"
			};
		}
		if (this.vertexArray.indexBuffer) {
			const { indexBuffer } = this.vertexArray;
			const values = indexBuffer.indexType === "uint32" ? new Uint32Array(indexBuffer.debugData) : new Uint16Array(indexBuffer.debugData);
			table["indices"] = {
				name: "indices",
				type: indexBuffer.indexType,
				values: values.toString()
			};
		}
		return table;
	}
	_getBufferOrConstantValues(attribute, dataType) {
		const TypedArrayConstructor = dataTypeDecoder.getTypedArrayConstructor(dataType);
		return (attribute instanceof Buffer ? new TypedArrayConstructor(attribute.debugData) : attribute).toString();
	}
	_getNonMaterialBindings(bindings) {
		if (!this.material) return bindings;
		const filteredBindings = {};
		for (const [name, binding] of Object.entries(bindings)) if (!this.material.ownsBinding(name)) filteredBindings[name] = binding;
		return filteredBindings;
	}
};
/** Create a shadertools platform info from the Device */
function getPlatformInfo(device) {
	return {
		type: device.type,
		shaderLanguage: device.info.shadingLanguage,
		shaderLanguageVersion: device.info.shadingLanguageVersion,
		gpu: device.info.gpu,
		features: device.features
	};
}
//#endregion
//#region node_modules/@deck.gl/core/dist/utils/deep-equal.js
/**
* Fast partial deep equal for prop.
*
* @param a Prop
* @param b Prop to compare against `a`
* @param depth Depth to which to recurse in nested Objects/Arrays. Use 0 (default) for shallow comparison, -1 for infinite depth
*/
function deepEqual(a, b, depth) {
	if (a === b) return true;
	if (!depth || !a || !b) return false;
	if (Array.isArray(a)) {
		if (!Array.isArray(b) || a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i], depth - 1)) return false;
		return true;
	}
	if (Array.isArray(b)) return false;
	if (typeof a === "object" && typeof b === "object") {
		const aKeys = Object.keys(a);
		const bKeys = Object.keys(b);
		if (aKeys.length !== bKeys.length) return false;
		for (const key of aKeys) {
			if (!b.hasOwnProperty(key)) return false;
			if (!deepEqual(a[key], b[key], depth - 1)) return false;
		}
		return true;
	}
	return false;
}
//#endregion
//#region node_modules/@deck.gl/core/dist/utils/shader.js
function mergeShaders(target, source) {
	if (!source) return target;
	const result = {
		...target,
		...source
	};
	if ("defines" in source) result.defines = {
		...target.defines,
		...source.defines
	};
	if ("modules" in source) {
		result.modules = (target.modules || []).concat(source.modules);
		if (source.modules.some((module) => module.name === "project64")) {
			const index = result.modules.findIndex((module) => module.name === "project32");
			if (index >= 0) result.modules.splice(index, 1);
		}
	}
	if ("inject" in source) if (!target.inject) result.inject = source.inject;
	else {
		const mergedInjection = { ...target.inject };
		for (const key in source.inject) mergedInjection[key] = (mergedInjection[key] || "") + source.inject[key];
		result.inject = mergedInjection;
	}
	return result;
}
//#endregion
export { UNIT as A, len as B, getOffsetOrigin as C, EVENT_HANDLERS as D, COORDINATE_SYSTEM as E, Matrix4 as F, negate$1 as G, sqrLen as H, scale as I, lerp$3 as J, clamp$1 as K, transformMat4 as L, geometry_default as M, fp64 as N, PROJECTION_MODE as O, fp64arithmetic as P, Vector3 as R, project_default as S, memoize as T, sub as U, lerp$1 as V, add as W, defaultLogger as X, ShaderAssembler as Y, fovyToAltitude as _, WebMercatorViewport as a, worldToLngLat as b, mergeBounds as c, typed_array_manager_default as d, flyToViewport as f, altitudeToFovy as g, addMetersToLngLat as h, uid as i, EventManager as j, RECOGNIZERS as k, mod as l, MAX_LATITUDE as m, deepEqual as n, Viewport as o, getFlyToDuration as p, equals as q, Model as r, fp64LowPart as s, mergeShaders as t, toDoublePrecisionArray as u, lngLatToWorld as v, getShaderCoordinateSystem as w, worldToPixels as x, pixelsToWorld as y, dist as z };

//# sourceMappingURL=shader-BokkZAiK.js.map