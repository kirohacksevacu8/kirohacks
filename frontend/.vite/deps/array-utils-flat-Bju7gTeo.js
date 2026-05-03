//#region node_modules/@probe.gl/env/dist/lib/globals.js
var window_ = globalThis;
globalThis.document;
var process_ = globalThis.process || {};
globalThis.console;
var navigator_ = globalThis.navigator || {};
//#endregion
//#region node_modules/@probe.gl/env/dist/lib/is-electron.js
function isElectron(mockUserAgent) {
	if (typeof window !== "undefined" && window.process?.type === "renderer") return true;
	if (typeof process !== "undefined" && Boolean(process.versions?.["electron"])) return true;
	const realUserAgent = typeof navigator !== "undefined" && navigator.userAgent;
	const userAgent = mockUserAgent || realUserAgent;
	return Boolean(userAgent && userAgent.indexOf("Electron") >= 0);
}
//#endregion
//#region node_modules/@probe.gl/env/dist/lib/is-browser.js
/** Check if in browser by duck-typing Node context */
function isBrowser() {
	return !(typeof process === "object" && String(process) === "[object process]" && !process?.browser) || isElectron();
}
//#endregion
//#region node_modules/@probe.gl/env/dist/lib/get-browser.js
function getBrowser(mockUserAgent) {
	if (!mockUserAgent && !isBrowser()) return "Node";
	if (isElectron(mockUserAgent)) return "Electron";
	if ((mockUserAgent || navigator_.userAgent || "").indexOf("Edge") > -1) return "Edge";
	if (globalThis.chrome) return "Chrome";
	if (globalThis.safari) return "Safari";
	if (globalThis.mozInnerScreenX) return "Firefox";
	return "Unknown";
}
//#endregion
//#region node_modules/@probe.gl/env/dist/index.js
var VERSION = "4.1.1";
//#endregion
//#region node_modules/@probe.gl/log/dist/utils/assert.js
function assert(condition, message) {
	if (!condition) throw new Error(message || "Assertion failed");
}
//#endregion
//#region node_modules/@probe.gl/log/dist/loggers/log-utils.js
/**
* Get logLevel from first argument:
* - log(logLevel, message, args) => logLevel
* - log(message, args) => 0
* - log({logLevel, ...}, message, args) => logLevel
* - log({logLevel, message, args}) => logLevel
*/
function normalizeLogLevel(logLevel) {
	if (!logLevel) return 0;
	let resolvedLevel;
	switch (typeof logLevel) {
		case "number":
			resolvedLevel = logLevel;
			break;
		case "object":
			resolvedLevel = logLevel.logLevel || logLevel.priority || 0;
			break;
		default: return 0;
	}
	assert(Number.isFinite(resolvedLevel) && resolvedLevel >= 0);
	return resolvedLevel;
}
/**
* "Normalizes" the various argument patterns into an object with known types
* - log(logLevel, message, args) => {logLevel, message, args}
* - log(message, args) => {logLevel: 0, message, args}
* - log({logLevel, ...}, message, args) => {logLevel, message, args}
* - log({logLevel, message, args}) => {logLevel, message, args}
*/
function normalizeArguments(opts) {
	const { logLevel, message } = opts;
	opts.logLevel = normalizeLogLevel(logLevel);
	const args = opts.args ? Array.from(opts.args) : [];
	while (args.length && args.shift() !== message);
	switch (typeof logLevel) {
		case "string":
		case "function":
			if (message !== void 0) args.unshift(message);
			opts.message = logLevel;
			break;
		case "object":
			Object.assign(opts, logLevel);
			break;
		default:
	}
	if (typeof opts.message === "function") opts.message = opts.message();
	const messageType = typeof opts.message;
	assert(messageType === "string" || messageType === "object");
	return Object.assign(opts, { args }, opts.opts);
}
//#endregion
//#region node_modules/@probe.gl/log/dist/loggers/base-log.js
var noop = () => {};
/**
* Base logger that implements log level handling and once de-duplication.
* Concrete loggers implement `_emit` to perform actual output.
*/
var BaseLog = class {
	constructor({ level = 0 } = {}) {
		this.userData = {};
		this._onceCache = /* @__PURE__ */ new Set();
		this._level = level;
	}
	set level(newLevel) {
		this.setLevel(newLevel);
	}
	get level() {
		return this.getLevel();
	}
	setLevel(level) {
		this._level = level;
		return this;
	}
	getLevel() {
		return this._level;
	}
	warn(message, ...args) {
		return this._log("warn", 0, message, args, { once: true });
	}
	error(message, ...args) {
		return this._log("error", 0, message, args);
	}
	log(logLevel, message, ...args) {
		return this._log("log", logLevel, message, args);
	}
	info(logLevel, message, ...args) {
		return this._log("info", logLevel, message, args);
	}
	once(logLevel, message, ...args) {
		return this._log("once", logLevel, message, args, { once: true });
	}
	_log(type, logLevel, message, args, options = {}) {
		const normalized = normalizeArguments({
			logLevel,
			message,
			args: this._buildArgs(logLevel, message, args),
			opts: options
		});
		return this._createLogFunction(type, normalized, options);
	}
	_buildArgs(logLevel, message, args) {
		return [
			logLevel,
			message,
			...args
		];
	}
	_createLogFunction(type, normalized, options) {
		if (!this._shouldLog(normalized.logLevel)) return noop;
		const tag = this._getOnceTag(options.tag ?? normalized.tag ?? normalized.message);
		if ((options.once || normalized.once) && tag !== void 0) {
			if (this._onceCache.has(tag)) return noop;
			this._onceCache.add(tag);
		}
		return this._emit(type, normalized);
	}
	_shouldLog(logLevel) {
		return this.getLevel() >= normalizeLogLevel(logLevel);
	}
	_getOnceTag(tag) {
		if (tag === void 0) return;
		try {
			return typeof tag === "string" ? tag : String(tag);
		} catch {
			return;
		}
	}
};
//#endregion
//#region node_modules/@probe.gl/log/dist/utils/local-storage.js
function getStorage(type) {
	try {
		const storage = window[type];
		const x = "__storage_test__";
		storage.setItem(x, x);
		storage.removeItem(x);
		return storage;
	} catch (e) {
		return null;
	}
}
var LocalStorage = class {
	constructor(id, defaultConfig, type = "sessionStorage") {
		this.storage = getStorage(type);
		this.id = id;
		this.config = defaultConfig;
		this._loadConfiguration();
	}
	getConfiguration() {
		return this.config;
	}
	setConfiguration(configuration) {
		Object.assign(this.config, configuration);
		if (this.storage) {
			const serialized = JSON.stringify(this.config);
			this.storage.setItem(this.id, serialized);
		}
	}
	_loadConfiguration() {
		let configuration = {};
		if (this.storage) {
			const serializedConfiguration = this.storage.getItem(this.id);
			configuration = serializedConfiguration ? JSON.parse(serializedConfiguration) : {};
		}
		Object.assign(this.config, configuration);
		return this;
	}
};
//#endregion
//#region node_modules/@probe.gl/log/dist/utils/formatters.js
/**
* Format time
*/
function formatTime(ms) {
	let formatted;
	if (ms < 10) formatted = `${ms.toFixed(2)}ms`;
	else if (ms < 100) formatted = `${ms.toFixed(1)}ms`;
	else if (ms < 1e3) formatted = `${ms.toFixed(0)}ms`;
	else formatted = `${(ms / 1e3).toFixed(2)}s`;
	return formatted;
}
function leftPad(string, length = 8) {
	const padLength = Math.max(length - string.length, 0);
	return `${" ".repeat(padLength)}${string}`;
}
//#endregion
//#region node_modules/@probe.gl/log/dist/utils/color.js
var COLOR;
(function(COLOR) {
	COLOR[COLOR["BLACK"] = 30] = "BLACK";
	COLOR[COLOR["RED"] = 31] = "RED";
	COLOR[COLOR["GREEN"] = 32] = "GREEN";
	COLOR[COLOR["YELLOW"] = 33] = "YELLOW";
	COLOR[COLOR["BLUE"] = 34] = "BLUE";
	COLOR[COLOR["MAGENTA"] = 35] = "MAGENTA";
	COLOR[COLOR["CYAN"] = 36] = "CYAN";
	COLOR[COLOR["WHITE"] = 37] = "WHITE";
	COLOR[COLOR["BRIGHT_BLACK"] = 90] = "BRIGHT_BLACK";
	COLOR[COLOR["BRIGHT_RED"] = 91] = "BRIGHT_RED";
	COLOR[COLOR["BRIGHT_GREEN"] = 92] = "BRIGHT_GREEN";
	COLOR[COLOR["BRIGHT_YELLOW"] = 93] = "BRIGHT_YELLOW";
	COLOR[COLOR["BRIGHT_BLUE"] = 94] = "BRIGHT_BLUE";
	COLOR[COLOR["BRIGHT_MAGENTA"] = 95] = "BRIGHT_MAGENTA";
	COLOR[COLOR["BRIGHT_CYAN"] = 96] = "BRIGHT_CYAN";
	COLOR[COLOR["BRIGHT_WHITE"] = 97] = "BRIGHT_WHITE";
})(COLOR || (COLOR = {}));
var BACKGROUND_INCREMENT = 10;
function getColor(color) {
	if (typeof color !== "string") return color;
	color = color.toUpperCase();
	return COLOR[color] || COLOR.WHITE;
}
function addColor(string, color, background) {
	if (!isBrowser && typeof string === "string") {
		if (color) string = `\u001b[${getColor(color)}m${string}\u001b[39m`;
		if (background) string = `\u001b[${getColor(background) + BACKGROUND_INCREMENT}m${string}\u001b[49m`;
	}
	return string;
}
//#endregion
//#region node_modules/@probe.gl/log/dist/utils/autobind.js
/**
* Binds the "this" argument of all functions on a class instance to the instance
* @param obj - class instance (typically a react component)
*/
function autobind(obj, predefined = ["constructor"]) {
	const propNames = Object.getOwnPropertyNames(Object.getPrototypeOf(obj));
	const object = obj;
	for (const key of propNames) {
		const value = object[key];
		if (typeof value === "function") {
			if (!predefined.find((name) => key === name)) object[key] = value.bind(obj);
		}
	}
}
//#endregion
//#region node_modules/@probe.gl/log/dist/utils/hi-res-timestamp.js
/** Get best timer available. */
function getHiResTimestamp() {
	let timestamp;
	if (isBrowser() && window_.performance) timestamp = window_?.performance?.now?.();
	else if ("hrtime" in process_) {
		const timeParts = process_?.hrtime?.();
		timestamp = timeParts[0] * 1e3 + timeParts[1] / 1e6;
	} else timestamp = Date.now();
	return timestamp;
}
//#endregion
//#region node_modules/@probe.gl/log/dist/loggers/probe-log.js
var originalConsole = {
	debug: isBrowser() ? console.debug || console.log : console.log,
	log: console.log,
	info: console.info,
	warn: console.warn,
	error: console.error
};
var DEFAULT_LOG_CONFIGURATION = {
	enabled: true,
	level: 0
};
/** A console wrapper */
var ProbeLog = class extends BaseLog {
	constructor({ id } = { id: "" }) {
		super({ level: 0 });
		this.VERSION = VERSION;
		this._startTs = getHiResTimestamp();
		this._deltaTs = getHiResTimestamp();
		this.userData = {};
		this.LOG_THROTTLE_TIMEOUT = 0;
		this.id = id;
		this.userData = {};
		this._storage = new LocalStorage(`__probe-${this.id}__`, { [this.id]: DEFAULT_LOG_CONFIGURATION });
		this.timeStamp(`${this.id} started`);
		autobind(this);
		Object.seal(this);
	}
	isEnabled() {
		return this._getConfiguration().enabled;
	}
	getLevel() {
		return this._getConfiguration().level;
	}
	/** @return milliseconds, with fractions */
	getTotal() {
		return Number((getHiResTimestamp() - this._startTs).toPrecision(10));
	}
	/** @return milliseconds, with fractions */
	getDelta() {
		return Number((getHiResTimestamp() - this._deltaTs).toPrecision(10));
	}
	/** @deprecated use logLevel */
	set priority(newPriority) {
		this.level = newPriority;
	}
	/** @deprecated use logLevel */
	get priority() {
		return this.level;
	}
	/** @deprecated use logLevel */
	getPriority() {
		return this.level;
	}
	enable(enabled = true) {
		this._updateConfiguration({ enabled });
		return this;
	}
	setLevel(level) {
		this._updateConfiguration({ level });
		return this;
	}
	/** return the current status of the setting */
	get(setting) {
		return this._getConfiguration()[setting];
	}
	set(setting, value) {
		this._updateConfiguration({ [setting]: value });
	}
	/** Logs the current settings as a table */
	settings() {
		if (console.table) console.table(this._storage.config);
		else console.log(this._storage.config);
	}
	assert(condition, message) {
		if (!condition) throw new Error(message || "Assertion failed");
	}
	warn(message, ...args) {
		return this._log("warn", 0, message, args, {
			method: originalConsole.warn,
			once: true
		});
	}
	error(message, ...args) {
		return this._log("error", 0, message, args, { method: originalConsole.error });
	}
	/** Print a deprecation warning */
	deprecated(oldUsage, newUsage) {
		return this.warn(`\`${oldUsage}\` is deprecated and will be removed \
in a later version. Use \`${newUsage}\` instead`);
	}
	/** Print a removal warning */
	removed(oldUsage, newUsage) {
		return this.error(`\`${oldUsage}\` has been removed. Use \`${newUsage}\` instead`);
	}
	probe(logLevel, message, ...args) {
		return this._log("log", logLevel, message, args, {
			method: originalConsole.log,
			time: true,
			once: true
		});
	}
	log(logLevel, message, ...args) {
		return this._log("log", logLevel, message, args, { method: originalConsole.debug });
	}
	info(logLevel, message, ...args) {
		return this._log("info", logLevel, message, args, { method: console.info });
	}
	once(logLevel, message, ...args) {
		return this._log("once", logLevel, message, args, {
			method: originalConsole.debug || originalConsole.info,
			once: true
		});
	}
	/** Logs an object as a table */
	table(logLevel, table, columns) {
		if (table) return this._log("table", logLevel, table, columns && [columns] || [], {
			method: console.table || noop,
			tag: getTableHeader(table)
		});
		return noop;
	}
	time(logLevel, message) {
		return this._log("time", logLevel, message, [], { method: console.time ? console.time : console.info });
	}
	timeEnd(logLevel, message) {
		return this._log("time", logLevel, message, [], { method: console.timeEnd ? console.timeEnd : console.info });
	}
	timeStamp(logLevel, message) {
		return this._log("time", logLevel, message, [], { method: console.timeStamp || noop });
	}
	group(logLevel, message, opts = { collapsed: false }) {
		const method = (opts.collapsed ? console.groupCollapsed : console.group) || console.info;
		return this._log("group", logLevel, message, [], { method });
	}
	groupCollapsed(logLevel, message, opts = {}) {
		return this.group(logLevel, message, Object.assign({}, opts, { collapsed: true }));
	}
	groupEnd(logLevel) {
		return this._log("groupEnd", logLevel, "", [], { method: console.groupEnd || noop });
	}
	withGroup(logLevel, message, func) {
		this.group(logLevel, message)();
		try {
			func();
		} finally {
			this.groupEnd(logLevel)();
		}
	}
	trace() {
		if (console.trace) console.trace();
	}
	_shouldLog(logLevel) {
		return this.isEnabled() && super._shouldLog(logLevel);
	}
	_emit(_type, normalized) {
		const method = normalized.method;
		assert(method);
		normalized.total = this.getTotal();
		normalized.delta = this.getDelta();
		this._deltaTs = getHiResTimestamp();
		const message = decorateMessage(this.id, normalized.message, normalized);
		return method.bind(console, message, ...normalized.args);
	}
	_getConfiguration() {
		if (!this._storage.config[this.id]) this._updateConfiguration(DEFAULT_LOG_CONFIGURATION);
		return this._storage.config[this.id];
	}
	_updateConfiguration(configuration) {
		const currentConfiguration = this._storage.config[this.id] || { ...DEFAULT_LOG_CONFIGURATION };
		this._storage.setConfiguration({ [this.id]: {
			...currentConfiguration,
			...configuration
		} });
	}
};
ProbeLog.VERSION = VERSION;
function decorateMessage(id, message, opts) {
	if (typeof message === "string") {
		const time = opts.time ? leftPad(formatTime(opts.total)) : "";
		message = opts.time ? `${id}: ${time}  ${message}` : `${id}: ${message}`;
		message = addColor(message, opts.color, opts.background);
	}
	return message;
}
function getTableHeader(table) {
	for (const key in table) for (const title in table[key]) return title || "untitled";
	return "empty";
}
//#endregion
//#region node_modules/@probe.gl/log/dist/init.js
globalThis.probe = {};
new ProbeLog({ id: "@probe.gl/log" });
//#endregion
//#region node_modules/@luma.gl/core/dist/utils/log.js
/** Global log instance */
var log = new ProbeLog({ id: "luma.gl" });
//#endregion
//#region node_modules/@luma.gl/core/dist/utils/uid.js
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
//#region node_modules/@luma.gl/core/dist/adapter/resources/resource.js
var CPU_HOTSPOT_PROFILER_MODULE = "cpu-hotspot-profiler";
var RESOURCE_COUNTS_STATS = "GPU Resource Counts";
var LEGACY_RESOURCE_COUNTS_STATS = "Resource Counts";
var GPU_TIME_AND_MEMORY_STATS = "GPU Time and Memory";
var BASE_RESOURCE_COUNT_ORDER = [
	"Resources",
	"Buffers",
	"Textures",
	"Samplers",
	"TextureViews",
	"Framebuffers",
	"QuerySets",
	"Shaders",
	"RenderPipelines",
	"ComputePipelines",
	"PipelineLayouts",
	"VertexArrays",
	"RenderPasss",
	"ComputePasss",
	"CommandEncoders",
	"CommandBuffers"
];
var WEBGL_RESOURCE_COUNT_ORDER = [
	"Resources",
	"Buffers",
	"Textures",
	"Samplers",
	"TextureViews",
	"Framebuffers",
	"QuerySets",
	"Shaders",
	"RenderPipelines",
	"SharedRenderPipelines",
	"ComputePipelines",
	"PipelineLayouts",
	"VertexArrays",
	"RenderPasss",
	"ComputePasss",
	"CommandEncoders",
	"CommandBuffers"
];
var BASE_RESOURCE_COUNT_STAT_ORDER = BASE_RESOURCE_COUNT_ORDER.flatMap((resourceType) => [`${resourceType} Created`, `${resourceType} Active`]);
var WEBGL_RESOURCE_COUNT_STAT_ORDER = WEBGL_RESOURCE_COUNT_ORDER.flatMap((resourceType) => [`${resourceType} Created`, `${resourceType} Active`]);
var ORDERED_STATS_CACHE = /* @__PURE__ */ new WeakMap();
var ORDERED_STAT_NAME_SET_CACHE = /* @__PURE__ */ new WeakMap();
/**
* Base class for GPU (WebGPU/WebGL) Resources
*/
var Resource = class {
	/** Default properties for resource */
	static defaultProps = {
		id: "undefined",
		handle: void 0,
		userData: void 0
	};
	toString() {
		return `${this[Symbol.toStringTag] || this.constructor.name}:"${this.id}"`;
	}
	/** props.id, for debugging. */
	id;
	/** The props that this resource was created with */
	props;
	/** User data object, reserved for the application */
	userData = {};
	/** The device that this resource is associated with - TODO can we remove this dup? */
	_device;
	/** Whether this resource has been destroyed */
	destroyed = false;
	/** For resources that allocate GPU memory */
	allocatedBytes = 0;
	/** Stats bucket currently holding the tracked allocation */
	allocatedBytesName = null;
	/** Attached resources will be destroyed when this resource is destroyed. Tracks auto-created "sub" resources. */
	_attachedResources = /* @__PURE__ */ new Set();
	/**
	* Create a new Resource. Called from Subclass
	*/
	constructor(device, props, defaultProps) {
		if (!device) throw new Error("no device");
		this._device = device;
		this.props = selectivelyMerge(props, defaultProps);
		const id = this.props.id !== "undefined" ? this.props.id : uid(this[Symbol.toStringTag]);
		this.props.id = id;
		this.id = id;
		this.userData = this.props.userData || {};
		this.addStats();
	}
	/**
	* destroy can be called on any resource to release it before it is garbage collected.
	*/
	destroy() {
		if (this.destroyed) return;
		this.destroyResource();
	}
	/** @deprecated Use destroy() */
	delete() {
		this.destroy();
		return this;
	}
	/**
	* Combines a map of user props and default props, only including props from defaultProps
	* @returns returns a map of overridden default props
	*/
	getProps() {
		return this.props;
	}
	/**
	* Attaches a resource. Attached resources are auto destroyed when this resource is destroyed
	* Called automatically when sub resources are auto created but can be called by application
	*/
	attachResource(resource) {
		this._attachedResources.add(resource);
	}
	/**
	* Detach an attached resource. The resource will no longer be auto-destroyed when this resource is destroyed.
	*/
	detachResource(resource) {
		this._attachedResources.delete(resource);
	}
	/**
	* Destroys a resource (only if owned), and removes from the owned (auto-destroy) list for this resource.
	*/
	destroyAttachedResource(resource) {
		if (this._attachedResources.delete(resource)) resource.destroy();
	}
	/** Destroy all owned resources. Make sure the resources are no longer needed before calling. */
	destroyAttachedResources() {
		for (const resource of this._attachedResources) resource.destroy();
		this._attachedResources = /* @__PURE__ */ new Set();
	}
	/** Perform all destroy steps. Can be called by derived resources when overriding destroy() */
	destroyResource() {
		if (this.destroyed) return;
		this.destroyAttachedResources();
		this.removeStats();
		this.destroyed = true;
	}
	/** Called by .destroy() to track object destruction. Subclass must call if overriding destroy() */
	removeStats() {
		const profiler = getCpuHotspotProfiler(this._device);
		const startTime = profiler ? getTimestamp() : 0;
		const statsObjects = [this._device.statsManager.getStats(RESOURCE_COUNTS_STATS), this._device.statsManager.getStats(LEGACY_RESOURCE_COUNTS_STATS)];
		const orderedStatNames = getResourceCountStatOrder(this._device);
		for (const stats of statsObjects) initializeStats(stats, orderedStatNames);
		const name = this.getStatsName();
		for (const stats of statsObjects) {
			stats.get("Resources Active").decrementCount();
			stats.get(`${name}s Active`).decrementCount();
		}
		if (profiler) {
			profiler.statsBookkeepingCalls = (profiler.statsBookkeepingCalls || 0) + 1;
			profiler.statsBookkeepingTimeMs = (profiler.statsBookkeepingTimeMs || 0) + (getTimestamp() - startTime);
		}
	}
	/** Called by subclass to track memory allocations */
	trackAllocatedMemory(bytes, name = this.getStatsName()) {
		const profiler = getCpuHotspotProfiler(this._device);
		const startTime = profiler ? getTimestamp() : 0;
		const stats = this._device.statsManager.getStats(GPU_TIME_AND_MEMORY_STATS);
		if (this.allocatedBytes > 0 && this.allocatedBytesName) {
			stats.get("GPU Memory").subtractCount(this.allocatedBytes);
			stats.get(`${this.allocatedBytesName} Memory`).subtractCount(this.allocatedBytes);
		}
		stats.get("GPU Memory").addCount(bytes);
		stats.get(`${name} Memory`).addCount(bytes);
		if (profiler) {
			profiler.statsBookkeepingCalls = (profiler.statsBookkeepingCalls || 0) + 1;
			profiler.statsBookkeepingTimeMs = (profiler.statsBookkeepingTimeMs || 0) + (getTimestamp() - startTime);
		}
		this.allocatedBytes = bytes;
		this.allocatedBytesName = name;
	}
	/** Called by subclass to track handle-backed memory allocations separately from owned allocations */
	trackReferencedMemory(bytes, name = this.getStatsName()) {
		this.trackAllocatedMemory(bytes, `Referenced ${name}`);
	}
	/** Called by subclass to track memory deallocations */
	trackDeallocatedMemory(name = this.getStatsName()) {
		if (this.allocatedBytes === 0) {
			this.allocatedBytesName = null;
			return;
		}
		const profiler = getCpuHotspotProfiler(this._device);
		const startTime = profiler ? getTimestamp() : 0;
		const stats = this._device.statsManager.getStats(GPU_TIME_AND_MEMORY_STATS);
		stats.get("GPU Memory").subtractCount(this.allocatedBytes);
		stats.get(`${this.allocatedBytesName || name} Memory`).subtractCount(this.allocatedBytes);
		if (profiler) {
			profiler.statsBookkeepingCalls = (profiler.statsBookkeepingCalls || 0) + 1;
			profiler.statsBookkeepingTimeMs = (profiler.statsBookkeepingTimeMs || 0) + (getTimestamp() - startTime);
		}
		this.allocatedBytes = 0;
		this.allocatedBytesName = null;
	}
	/** Called by subclass to deallocate handle-backed memory tracked via trackReferencedMemory() */
	trackDeallocatedReferencedMemory(name = this.getStatsName()) {
		this.trackDeallocatedMemory(`Referenced ${name}`);
	}
	/** Called by resource constructor to track object creation */
	addStats() {
		const name = this.getStatsName();
		const profiler = getCpuHotspotProfiler(this._device);
		const startTime = profiler ? getTimestamp() : 0;
		const statsObjects = [this._device.statsManager.getStats(RESOURCE_COUNTS_STATS), this._device.statsManager.getStats(LEGACY_RESOURCE_COUNTS_STATS)];
		const orderedStatNames = getResourceCountStatOrder(this._device);
		for (const stats of statsObjects) initializeStats(stats, orderedStatNames);
		for (const stats of statsObjects) {
			stats.get("Resources Created").incrementCount();
			stats.get("Resources Active").incrementCount();
			stats.get(`${name}s Created`).incrementCount();
			stats.get(`${name}s Active`).incrementCount();
		}
		if (profiler) {
			profiler.statsBookkeepingCalls = (profiler.statsBookkeepingCalls || 0) + 1;
			profiler.statsBookkeepingTimeMs = (profiler.statsBookkeepingTimeMs || 0) + (getTimestamp() - startTime);
		}
		recordTransientCanvasResourceCreate(this._device, name);
	}
	/** Canonical resource name used for stats buckets. */
	getStatsName() {
		return getCanonicalResourceName(this);
	}
};
/**
* Combines a map of user props and default props, only including props from defaultProps
* @param props
* @param defaultProps
* @returns returns a map of overridden default props
*/
function selectivelyMerge(props, defaultProps) {
	const mergedProps = { ...defaultProps };
	for (const key in props) if (props[key] !== void 0) mergedProps[key] = props[key];
	return mergedProps;
}
function initializeStats(stats, orderedStatNames) {
	const statsMap = stats.stats;
	let addedOrderedStat = false;
	for (const statName of orderedStatNames) if (!statsMap[statName]) {
		stats.get(statName);
		addedOrderedStat = true;
	}
	const statCount = Object.keys(statsMap).length;
	const cachedStats = ORDERED_STATS_CACHE.get(stats);
	if (!addedOrderedStat && cachedStats?.orderedStatNames === orderedStatNames && cachedStats.statCount === statCount) return;
	const reorderedStats = {};
	let orderedStatNamesSet = ORDERED_STAT_NAME_SET_CACHE.get(orderedStatNames);
	if (!orderedStatNamesSet) {
		orderedStatNamesSet = new Set(orderedStatNames);
		ORDERED_STAT_NAME_SET_CACHE.set(orderedStatNames, orderedStatNamesSet);
	}
	for (const statName of orderedStatNames) if (statsMap[statName]) reorderedStats[statName] = statsMap[statName];
	for (const [statName, stat] of Object.entries(statsMap)) if (!orderedStatNamesSet.has(statName)) reorderedStats[statName] = stat;
	for (const statName of Object.keys(statsMap)) delete statsMap[statName];
	Object.assign(statsMap, reorderedStats);
	ORDERED_STATS_CACHE.set(stats, {
		orderedStatNames,
		statCount
	});
}
function getResourceCountStatOrder(device) {
	return device.type === "webgl" ? WEBGL_RESOURCE_COUNT_STAT_ORDER : BASE_RESOURCE_COUNT_STAT_ORDER;
}
function getCpuHotspotProfiler(device) {
	const profiler = device.userData[CPU_HOTSPOT_PROFILER_MODULE];
	return profiler?.enabled ? profiler : null;
}
function getTimestamp() {
	return globalThis.performance?.now?.() ?? Date.now();
}
function recordTransientCanvasResourceCreate(device, name) {
	const profiler = getCpuHotspotProfiler(device);
	if (!profiler || !profiler.activeDefaultFramebufferAcquireDepth) return;
	profiler.transientCanvasResourceCreates = (profiler.transientCanvasResourceCreates || 0) + 1;
	switch (name) {
		case "Texture":
			profiler.transientCanvasTextureCreates = (profiler.transientCanvasTextureCreates || 0) + 1;
			break;
		case "TextureView":
			profiler.transientCanvasTextureViewCreates = (profiler.transientCanvasTextureViewCreates || 0) + 1;
			break;
		case "Sampler":
			profiler.transientCanvasSamplerCreates = (profiler.transientCanvasSamplerCreates || 0) + 1;
			break;
		case "Framebuffer":
			profiler.transientCanvasFramebufferCreates = (profiler.transientCanvasFramebufferCreates || 0) + 1;
			break;
		default: break;
	}
}
function getCanonicalResourceName(resource) {
	let prototype = Object.getPrototypeOf(resource);
	while (prototype) {
		const parentPrototype = Object.getPrototypeOf(prototype);
		if (!parentPrototype || parentPrototype === Resource.prototype) return getPrototypeToStringTag(prototype) || resource[Symbol.toStringTag] || resource.constructor.name;
		prototype = parentPrototype;
	}
	return resource[Symbol.toStringTag] || resource.constructor.name;
}
function getPrototypeToStringTag(prototype) {
	const descriptor = Object.getOwnPropertyDescriptor(prototype, Symbol.toStringTag);
	if (typeof descriptor?.get === "function") return descriptor.get.call(prototype);
	if (typeof descriptor?.value === "string") return descriptor.value;
	return null;
}
//#endregion
//#region node_modules/@luma.gl/core/dist/adapter/resources/buffer.js
/** Abstract GPU buffer */
var Buffer = class Buffer extends Resource {
	/** Index buffer */
	static INDEX = 16;
	/** Vertex buffer */
	static VERTEX = 32;
	/** Uniform buffer */
	static UNIFORM = 64;
	/** Storage buffer */
	static STORAGE = 128;
	static INDIRECT = 256;
	static QUERY_RESOLVE = 512;
	static MAP_READ = 1;
	static MAP_WRITE = 2;
	static COPY_SRC = 4;
	static COPY_DST = 8;
	get [Symbol.toStringTag]() {
		return "Buffer";
	}
	/** The usage with which this buffer was created */
	usage;
	/** For index buffers, whether indices are 8, 16 or 32 bit. Note: uint8 indices are automatically converted to uint16 for WebGPU compatibility */
	indexType;
	/** "Time" of last update, can be used to check if redraw is needed */
	updateTimestamp;
	constructor(device, props) {
		const deducedProps = { ...props };
		if ((props.usage || 0) & Buffer.INDEX && !props.indexType) {
			if (props.data instanceof Uint32Array) deducedProps.indexType = "uint32";
			else if (props.data instanceof Uint16Array) deducedProps.indexType = "uint16";
			else if (props.data instanceof Uint8Array) deducedProps.indexType = "uint8";
		}
		delete deducedProps.data;
		super(device, deducedProps, Buffer.defaultProps);
		this.usage = deducedProps.usage || 0;
		this.indexType = deducedProps.indexType;
		this.updateTimestamp = device.incrementTimestamp();
	}
	/**
	* Create a copy of this Buffer with new byteLength, with same props but of the specified size.
	* @note Does not copy contents of the cloned Buffer.
	*/
	clone(props) {
		return this.device.createBuffer({
			...this.props,
			...props
		});
	}
	/** Max amount of debug data saved. Two vec4's */
	static DEBUG_DATA_MAX_LENGTH = 32;
	/** A partial CPU-side copy of the data in this buffer, for debugging purposes */
	debugData = /* @__PURE__ */ new ArrayBuffer(0);
	/** This doesn't handle partial non-zero offset updates correctly */
	_setDebugData(data, _byteOffset, byteLength) {
		let arrayBufferView = null;
		let arrayBuffer;
		if (ArrayBuffer.isView(data)) {
			arrayBufferView = data;
			arrayBuffer = data.buffer;
		} else arrayBuffer = data;
		const debugDataLength = Math.min(data ? data.byteLength : byteLength, Buffer.DEBUG_DATA_MAX_LENGTH);
		if (arrayBuffer === null) this.debugData = new ArrayBuffer(debugDataLength);
		else {
			const sourceByteOffset = Math.min(arrayBufferView?.byteOffset || 0, arrayBuffer.byteLength);
			const availableByteLength = Math.max(0, arrayBuffer.byteLength - sourceByteOffset);
			const copyByteLength = Math.min(debugDataLength, availableByteLength);
			this.debugData = new Uint8Array(arrayBuffer, sourceByteOffset, copyByteLength).slice().buffer;
		}
	}
	static defaultProps = {
		...Resource.defaultProps,
		usage: 0,
		byteLength: 0,
		byteOffset: 0,
		data: null,
		indexType: "uint16",
		onMapped: void 0
	};
};
//#endregion
//#region node_modules/@luma.gl/core/dist/shadertypes/data-types/data-type-decoder.js
var DataTypeDecoder = class {
	/**
	* Gets info about a data type constant (signed or normalized)
	* @returns underlying primitive / signed types, byte length, normalization, integer, signed flags
	*/
	getDataTypeInfo(type) {
		const [signedType, primitiveType, byteLength] = NORMALIZED_TYPE_MAP$1[type];
		const normalized = type.includes("norm");
		return {
			signedType,
			primitiveType,
			byteLength,
			normalized,
			integer: !normalized && !type.startsWith("float"),
			signed: type.startsWith("s")
		};
	}
	/** Build a vertex format from a signed data type and a component */
	getNormalizedDataType(signedDataType) {
		const dataType = signedDataType;
		switch (dataType) {
			case "uint8": return "unorm8";
			case "sint8": return "snorm8";
			case "uint16": return "unorm16";
			case "sint16": return "snorm16";
			default: return dataType;
		}
	}
	/** Align offset to 1, 2 or 4 elements (4, 8 or 16 bytes) */
	alignTo(size, count) {
		switch (count) {
			case 1: return size;
			case 2: return size + size % 2;
			default: return size + (4 - size % 4) % 4;
		}
	}
	/** Returns the VariableShaderType that corresponds to a typed array */
	getDataType(arrayOrType) {
		const Constructor = ArrayBuffer.isView(arrayOrType) ? arrayOrType.constructor : arrayOrType;
		if (Constructor === Uint8ClampedArray) return "uint8";
		const info = Object.values(NORMALIZED_TYPE_MAP$1).find((entry) => Constructor === entry[4]);
		if (!info) throw new Error(Constructor.name);
		return info[0];
	}
	/** Returns the TypedArray that corresponds to a shader data type */
	getTypedArrayConstructor(type) {
		const [, , , , Constructor] = NORMALIZED_TYPE_MAP$1[type];
		return Constructor;
	}
};
/** Entry point for decoding luma.gl data types */
var dataTypeDecoder = new DataTypeDecoder();
var NORMALIZED_TYPE_MAP$1 = {
	uint8: [
		"uint8",
		"u32",
		1,
		false,
		Uint8Array
	],
	sint8: [
		"sint8",
		"i32",
		1,
		false,
		Int8Array
	],
	unorm8: [
		"uint8",
		"f32",
		1,
		true,
		Uint8Array
	],
	snorm8: [
		"sint8",
		"f32",
		1,
		true,
		Int8Array
	],
	uint16: [
		"uint16",
		"u32",
		2,
		false,
		Uint16Array
	],
	sint16: [
		"sint16",
		"i32",
		2,
		false,
		Int16Array
	],
	unorm16: [
		"uint16",
		"u32",
		2,
		true,
		Uint16Array
	],
	snorm16: [
		"sint16",
		"i32",
		2,
		true,
		Int16Array
	],
	float16: [
		"float16",
		"f16",
		2,
		false,
		Uint16Array
	],
	float32: [
		"float32",
		"f32",
		4,
		false,
		Float32Array
	],
	uint32: [
		"uint32",
		"u32",
		4,
		false,
		Uint32Array
	],
	sint32: [
		"sint32",
		"i32",
		4,
		false,
		Int32Array
	]
};
//#endregion
//#region node_modules/@luma.gl/core/dist/shadertypes/vertex-types/vertex-format-decoder.js
var VertexFormatDecoder = class {
	/**
	* Decodes a vertex format, returning type, components, byte  length and flags (integer, signed, normalized)
	*/
	getVertexFormatInfo(format) {
		let webglOnly;
		if (format.endsWith("-webgl")) {
			format.replace("-webgl", "");
			webglOnly = true;
		}
		const [type_, count] = format.split("x");
		const type = type_;
		const components = count ? parseInt(count) : 1;
		const decodedType = dataTypeDecoder.getDataTypeInfo(type);
		const result = {
			type,
			components,
			byteLength: decodedType.byteLength * components,
			integer: decodedType.integer,
			signed: decodedType.signed,
			normalized: decodedType.normalized
		};
		if (webglOnly) result.webglOnly = true;
		return result;
	}
	/** Build a vertex format from a signed data type and a component */
	makeVertexFormat(signedDataType, components, normalized) {
		const dataType = normalized ? dataTypeDecoder.getNormalizedDataType(signedDataType) : signedDataType;
		switch (dataType) {
			case "unorm8":
				if (components === 1) return "unorm8";
				if (components === 3) return "unorm8x3-webgl";
				return `${dataType}x${components}`;
			case "snorm8":
				if (components === 1) return "snorm8";
				if (components === 3) return "snorm8x3-webgl";
				return `${dataType}x${components}`;
			case "uint8":
			case "sint8":
				if (components === 1 || components === 3) throw new Error(`size: ${components}`);
				return `${dataType}x${components}`;
			case "uint16":
				if (components === 1) return "uint16";
				if (components === 3) return "uint16x3-webgl";
				return `${dataType}x${components}`;
			case "sint16":
				if (components === 1) return "sint16";
				if (components === 3) return "sint16x3-webgl";
				return `${dataType}x${components}`;
			case "unorm16":
				if (components === 1) return "unorm16";
				if (components === 3) return "unorm16x3-webgl";
				return `${dataType}x${components}`;
			case "snorm16":
				if (components === 1) return "snorm16";
				if (components === 3) return "snorm16x3-webgl";
				return `${dataType}x${components}`;
			case "float16":
				if (components === 1 || components === 3) throw new Error(`size: ${components}`);
				return `${dataType}x${components}`;
			default: return components === 1 ? dataType : `${dataType}x${components}`;
		}
	}
	/** Get the vertex format for an attribute with TypedArray and size */
	getVertexFormatFromAttribute(typedArray, size, normalized) {
		if (!size || size > 4) throw new Error(`size ${size}`);
		const components = size;
		const signedDataType = dataTypeDecoder.getDataType(typedArray);
		return this.makeVertexFormat(signedDataType, components, normalized);
	}
	/**
	* Return a "default" vertex format for a certain shader data type
	* The simplest vertex format that matches the shader attribute's data type
	*/
	getCompatibleVertexFormat(opts) {
		let vertexType;
		switch (opts.primitiveType) {
			case "f32":
				vertexType = "float32";
				break;
			case "i32":
				vertexType = "sint32";
				break;
			case "u32":
				vertexType = "uint32";
				break;
			case "f16": return opts.components <= 2 ? "float16x2" : "float16x4";
		}
		if (opts.components === 1) return vertexType;
		return `${vertexType}x${opts.components}`;
	}
};
/** Decoder for luma.gl vertex types */
var vertexFormatDecoder = new VertexFormatDecoder();
//#endregion
//#region node_modules/@luma.gl/core/dist/shadertypes/texture-types/texture-format-table.js
var texture_compression_bc = "texture-compression-bc";
var texture_compression_astc = "texture-compression-astc";
var texture_compression_etc2 = "texture-compression-etc2";
var texture_compression_etc1_webgl = "texture-compression-etc1-webgl";
var texture_compression_pvrtc_webgl = "texture-compression-pvrtc-webgl";
var texture_compression_atc_webgl = "texture-compression-atc-webgl";
var float32_renderable = "float32-renderable-webgl";
var float16_renderable = "float16-renderable-webgl";
var rgb9e5ufloat_renderable = "rgb9e5ufloat-renderable-webgl";
var snorm8_renderable = "snorm8-renderable-webgl";
var norm16_webgl = "norm16-webgl";
var norm16_renderable = "norm16-renderable-webgl";
var snorm16_renderable = "snorm16-renderable-webgl";
var float32_filterable = "float32-filterable";
var float16_filterable = "float16-filterable-webgl";
function getTextureFormatDefinition(format) {
	const info = TEXTURE_FORMAT_TABLE[format];
	if (!info) throw new Error(`Unsupported texture format ${format}`);
	return info;
}
function getTextureFormatTable() {
	return TEXTURE_FORMAT_TABLE;
}
var TEXTURE_FORMAT_COLOR_DEPTH_TABLE = {
	"r8unorm": {},
	"rg8unorm": {},
	"rgb8unorm-webgl": {},
	"rgba8unorm": {},
	"rgba8unorm-srgb": {},
	"r8snorm": { render: snorm8_renderable },
	"rg8snorm": { render: snorm8_renderable },
	"rgb8snorm-webgl": {},
	"rgba8snorm": { render: snorm8_renderable },
	"r8uint": {},
	"rg8uint": {},
	"rgba8uint": {},
	"r8sint": {},
	"rg8sint": {},
	"rgba8sint": {},
	"bgra8unorm": {},
	"bgra8unorm-srgb": {},
	"r16unorm": {
		f: norm16_webgl,
		render: norm16_renderable
	},
	"rg16unorm": {
		f: norm16_webgl,
		render: norm16_renderable
	},
	"rgb16unorm-webgl": {
		f: norm16_webgl,
		render: false
	},
	"rgba16unorm": {
		f: norm16_webgl,
		render: norm16_renderable
	},
	"r16snorm": {
		f: norm16_webgl,
		render: snorm16_renderable
	},
	"rg16snorm": {
		f: norm16_webgl,
		render: snorm16_renderable
	},
	"rgb16snorm-webgl": {
		f: norm16_webgl,
		render: false
	},
	"rgba16snorm": {
		f: norm16_webgl,
		render: snorm16_renderable
	},
	"r16uint": {},
	"rg16uint": {},
	"rgba16uint": {},
	"r16sint": {},
	"rg16sint": {},
	"rgba16sint": {},
	"r16float": {
		render: float16_renderable,
		filter: "float16-filterable-webgl"
	},
	"rg16float": {
		render: float16_renderable,
		filter: float16_filterable
	},
	"rgba16float": {
		render: float16_renderable,
		filter: float16_filterable
	},
	"r32uint": {},
	"rg32uint": {},
	"rgba32uint": {},
	"r32sint": {},
	"rg32sint": {},
	"rgba32sint": {},
	"r32float": {
		render: float32_renderable,
		filter: float32_filterable
	},
	"rg32float": {
		render: false,
		filter: float32_filterable
	},
	"rgb32float-webgl": {
		render: float32_renderable,
		filter: float32_filterable
	},
	"rgba32float": {
		render: float32_renderable,
		filter: float32_filterable
	},
	"rgba4unorm-webgl": {
		channels: "rgba",
		bitsPerChannel: [
			4,
			4,
			4,
			4
		],
		packed: true
	},
	"rgb565unorm-webgl": {
		channels: "rgb",
		bitsPerChannel: [
			5,
			6,
			5,
			0
		],
		packed: true
	},
	"rgb5a1unorm-webgl": {
		channels: "rgba",
		bitsPerChannel: [
			5,
			5,
			5,
			1
		],
		packed: true
	},
	"rgb9e5ufloat": {
		channels: "rgb",
		packed: true,
		render: rgb9e5ufloat_renderable
	},
	"rg11b10ufloat": {
		channels: "rgb",
		bitsPerChannel: [
			11,
			11,
			10,
			0
		],
		packed: true,
		p: 1,
		render: float32_renderable
	},
	"rgb10a2unorm": {
		channels: "rgba",
		bitsPerChannel: [
			10,
			10,
			10,
			2
		],
		packed: true,
		p: 1
	},
	"rgb10a2uint": {
		channels: "rgba",
		bitsPerChannel: [
			10,
			10,
			10,
			2
		],
		packed: true,
		p: 1
	},
	stencil8: {
		attachment: "stencil",
		bitsPerChannel: [
			8,
			0,
			0,
			0
		],
		dataType: "uint8"
	},
	"depth16unorm": {
		attachment: "depth",
		bitsPerChannel: [
			16,
			0,
			0,
			0
		],
		dataType: "uint16"
	},
	"depth24plus": {
		attachment: "depth",
		bitsPerChannel: [
			24,
			0,
			0,
			0
		],
		dataType: "uint32"
	},
	"depth32float": {
		attachment: "depth",
		bitsPerChannel: [
			32,
			0,
			0,
			0
		],
		dataType: "float32"
	},
	"depth24plus-stencil8": {
		attachment: "depth-stencil",
		bitsPerChannel: [
			24,
			8,
			0,
			0
		],
		packed: true
	},
	"depth32float-stencil8": {
		attachment: "depth-stencil",
		bitsPerChannel: [
			32,
			8,
			0,
			0
		],
		packed: true
	}
};
var TEXTURE_FORMAT_COMPRESSED_TABLE = {
	"bc1-rgb-unorm-webgl": { f: texture_compression_bc },
	"bc1-rgb-unorm-srgb-webgl": { f: texture_compression_bc },
	"bc1-rgba-unorm": { f: texture_compression_bc },
	"bc1-rgba-unorm-srgb": { f: texture_compression_bc },
	"bc2-rgba-unorm": { f: texture_compression_bc },
	"bc2-rgba-unorm-srgb": { f: texture_compression_bc },
	"bc3-rgba-unorm": { f: texture_compression_bc },
	"bc3-rgba-unorm-srgb": { f: texture_compression_bc },
	"bc4-r-unorm": { f: texture_compression_bc },
	"bc4-r-snorm": { f: texture_compression_bc },
	"bc5-rg-unorm": { f: texture_compression_bc },
	"bc5-rg-snorm": { f: texture_compression_bc },
	"bc6h-rgb-ufloat": { f: texture_compression_bc },
	"bc6h-rgb-float": { f: texture_compression_bc },
	"bc7-rgba-unorm": { f: texture_compression_bc },
	"bc7-rgba-unorm-srgb": { f: texture_compression_bc },
	"etc2-rgb8unorm": { f: texture_compression_etc2 },
	"etc2-rgb8unorm-srgb": { f: texture_compression_etc2 },
	"etc2-rgb8a1unorm": { f: texture_compression_etc2 },
	"etc2-rgb8a1unorm-srgb": { f: texture_compression_etc2 },
	"etc2-rgba8unorm": { f: texture_compression_etc2 },
	"etc2-rgba8unorm-srgb": { f: texture_compression_etc2 },
	"eac-r11unorm": { f: texture_compression_etc2 },
	"eac-r11snorm": { f: texture_compression_etc2 },
	"eac-rg11unorm": { f: texture_compression_etc2 },
	"eac-rg11snorm": { f: texture_compression_etc2 },
	"astc-4x4-unorm": { f: texture_compression_astc },
	"astc-4x4-unorm-srgb": { f: texture_compression_astc },
	"astc-5x4-unorm": { f: texture_compression_astc },
	"astc-5x4-unorm-srgb": { f: texture_compression_astc },
	"astc-5x5-unorm": { f: texture_compression_astc },
	"astc-5x5-unorm-srgb": { f: texture_compression_astc },
	"astc-6x5-unorm": { f: texture_compression_astc },
	"astc-6x5-unorm-srgb": { f: texture_compression_astc },
	"astc-6x6-unorm": { f: texture_compression_astc },
	"astc-6x6-unorm-srgb": { f: texture_compression_astc },
	"astc-8x5-unorm": { f: texture_compression_astc },
	"astc-8x5-unorm-srgb": { f: texture_compression_astc },
	"astc-8x6-unorm": { f: texture_compression_astc },
	"astc-8x6-unorm-srgb": { f: texture_compression_astc },
	"astc-8x8-unorm": { f: texture_compression_astc },
	"astc-8x8-unorm-srgb": { f: texture_compression_astc },
	"astc-10x5-unorm": { f: texture_compression_astc },
	"astc-10x5-unorm-srgb": { f: texture_compression_astc },
	"astc-10x6-unorm": { f: texture_compression_astc },
	"astc-10x6-unorm-srgb": { f: texture_compression_astc },
	"astc-10x8-unorm": { f: texture_compression_astc },
	"astc-10x8-unorm-srgb": { f: texture_compression_astc },
	"astc-10x10-unorm": { f: texture_compression_astc },
	"astc-10x10-unorm-srgb": { f: texture_compression_astc },
	"astc-12x10-unorm": { f: texture_compression_astc },
	"astc-12x10-unorm-srgb": { f: texture_compression_astc },
	"astc-12x12-unorm": { f: texture_compression_astc },
	"astc-12x12-unorm-srgb": { f: texture_compression_astc },
	"pvrtc-rgb4unorm-webgl": { f: texture_compression_pvrtc_webgl },
	"pvrtc-rgba4unorm-webgl": { f: texture_compression_pvrtc_webgl },
	"pvrtc-rgb2unorm-webgl": { f: texture_compression_pvrtc_webgl },
	"pvrtc-rgba2unorm-webgl": { f: texture_compression_pvrtc_webgl },
	"etc1-rbg-unorm-webgl": { f: texture_compression_etc1_webgl },
	"atc-rgb-unorm-webgl": { f: texture_compression_atc_webgl },
	"atc-rgba-unorm-webgl": { f: texture_compression_atc_webgl },
	"atc-rgbai-unorm-webgl": { f: texture_compression_atc_webgl }
};
var TEXTURE_FORMAT_TABLE = {
	...TEXTURE_FORMAT_COLOR_DEPTH_TABLE,
	...TEXTURE_FORMAT_COMPRESSED_TABLE
};
//#endregion
//#region node_modules/@luma.gl/core/dist/shadertypes/texture-types/texture-format-decoder.js
var RGB_FORMAT_REGEX = /^(r|rg|rgb|rgba|bgra)([0-9]*)([a-z]*)(-srgb)?(-webgl)?$/;
var COLOR_FORMAT_PREFIXES = [
	"rgb",
	"rgba",
	"bgra"
];
var DEPTH_FORMAT_PREFIXES = ["depth", "stencil"];
var COMPRESSED_TEXTURE_FORMAT_PREFIXES = [
	"bc1",
	"bc2",
	"bc3",
	"bc4",
	"bc5",
	"bc6",
	"bc7",
	"etc1",
	"etc2",
	"eac",
	"atc",
	"astc",
	"pvrtc"
];
/** Class that helps applications work with texture formats */
var TextureFormatDecoder = class {
	/** Checks if a texture format is color */
	isColor(format) {
		return COLOR_FORMAT_PREFIXES.some((prefix) => format.startsWith(prefix));
	}
	/** Checks if a texture format is depth or stencil */
	isDepthStencil(format) {
		return DEPTH_FORMAT_PREFIXES.some((prefix) => format.startsWith(prefix));
	}
	/** Checks if a texture format is compressed */
	isCompressed(format) {
		return COMPRESSED_TEXTURE_FORMAT_PREFIXES.some((prefix) => format.startsWith(prefix));
	}
	/** Returns information about a texture format, e.g. attachment type, components, byte length and flags (integer, signed, normalized) */
	getInfo(format) {
		return getTextureFormatInfo(format);
	}
	/**  "static" capabilities of a texture format. @note Needs to be adjusted against current device */
	getCapabilities(format) {
		return getTextureFormatCapabilities(format);
	}
	/** Computes the memory layout for a texture, in particular including row byte alignment */
	computeMemoryLayout(opts) {
		return computeTextureMemoryLayout(opts);
	}
};
/** Decoder for luma.gl texture types */
var textureFormatDecoder = new TextureFormatDecoder();
/** Get the memory layout of a texture */
function computeTextureMemoryLayout({ format, width, height, depth, byteAlignment }) {
	const { bytesPerPixel, bytesPerBlock = bytesPerPixel, blockWidth = 1, blockHeight = 1, compressed = false } = textureFormatDecoder.getInfo(format);
	const blockColumns = compressed ? Math.ceil(width / blockWidth) : width;
	const blockRows = compressed ? Math.ceil(height / blockHeight) : height;
	const unpaddedBytesPerRow = blockColumns * bytesPerBlock;
	const bytesPerRow = Math.ceil(unpaddedBytesPerRow / byteAlignment) * byteAlignment;
	const rowsPerImage = blockRows;
	const byteLength = bytesPerRow * rowsPerImage * depth;
	return {
		bytesPerPixel,
		bytesPerRow,
		rowsPerImage,
		depthOrArrayLayers: depth,
		bytesPerImage: bytesPerRow * rowsPerImage,
		byteLength
	};
}
function getTextureFormatCapabilities(format) {
	const info = getTextureFormatDefinition(format);
	const formatCapabilities = {
		format,
		create: info.f ?? true,
		render: info.render ?? true,
		filter: info.filter ?? true,
		blend: info.blend ?? true,
		store: info.store ?? true
	};
	const formatInfo = getTextureFormatInfo(format);
	const isDepthStencil = format.startsWith("depth") || format.startsWith("stencil");
	const isSigned = formatInfo?.signed;
	const isInteger = formatInfo?.integer;
	const isWebGLSpecific = formatInfo?.webgl;
	const isCompressed = Boolean(formatInfo?.compressed);
	formatCapabilities.render &&= !isDepthStencil && !isCompressed;
	formatCapabilities.filter &&= !isDepthStencil && !isSigned && !isInteger && !isWebGLSpecific;
	return formatCapabilities;
}
/**
* Decodes a texture format, returning e.g. attatchment type, components, byte length and flags (integer, signed, normalized)
*/
function getTextureFormatInfo(format) {
	let formatInfo = getTextureFormatInfoUsingTable(format);
	if (textureFormatDecoder.isCompressed(format)) {
		formatInfo.channels = "rgb";
		formatInfo.components = 3;
		formatInfo.bytesPerPixel = 1;
		formatInfo.srgb = false;
		formatInfo.compressed = true;
		formatInfo.bytesPerBlock = getCompressedTextureBlockByteLength(format);
		const blockSize = getCompressedTextureBlockSize(format);
		if (blockSize) {
			formatInfo.blockWidth = blockSize.blockWidth;
			formatInfo.blockHeight = blockSize.blockHeight;
		}
	}
	const matches = !formatInfo.packed ? RGB_FORMAT_REGEX.exec(format) : null;
	if (matches) {
		const [, channels, length, type, srgb, suffix] = matches;
		const dataType = `${type}${length}`;
		const decodedType = dataTypeDecoder.getDataTypeInfo(dataType);
		const bits = decodedType.byteLength * 8;
		const components = channels?.length ?? 1;
		const bitsPerChannel = [
			bits,
			components >= 2 ? bits : 0,
			components >= 3 ? bits : 0,
			components >= 4 ? bits : 0
		];
		formatInfo = {
			format,
			attachment: formatInfo.attachment,
			dataType: decodedType.signedType,
			components,
			channels,
			integer: decodedType.integer,
			signed: decodedType.signed,
			normalized: decodedType.normalized,
			bitsPerChannel,
			bytesPerPixel: decodedType.byteLength * components,
			packed: formatInfo.packed,
			srgb: formatInfo.srgb
		};
		if (suffix === "-webgl") formatInfo.webgl = true;
		if (srgb === "-srgb") formatInfo.srgb = true;
	}
	if (format.endsWith("-webgl")) formatInfo.webgl = true;
	if (format.endsWith("-srgb")) formatInfo.srgb = true;
	return formatInfo;
}
/** Decode texture format info from the table */
function getTextureFormatInfoUsingTable(format) {
	const info = getTextureFormatDefinition(format);
	const bytesPerPixel = info.bytesPerPixel || 1;
	const bitsPerChannel = info.bitsPerChannel || [
		8,
		8,
		8,
		8
	];
	delete info.bitsPerChannel;
	delete info.bytesPerPixel;
	delete info.f;
	delete info.render;
	delete info.filter;
	delete info.blend;
	delete info.store;
	return {
		...info,
		format,
		attachment: info.attachment || "color",
		channels: info.channels || "r",
		components: info.components || info.channels?.length || 1,
		bytesPerPixel,
		bitsPerChannel,
		dataType: info.dataType || "uint8",
		srgb: info.srgb ?? false,
		packed: info.packed ?? false,
		webgl: info.webgl ?? false,
		integer: info.integer ?? false,
		signed: info.signed ?? false,
		normalized: info.normalized ?? false,
		compressed: info.compressed ?? false
	};
}
/** Parses ASTC block widths from format string */
function getCompressedTextureBlockSize(format) {
	const matches = /.*-(\d+)x(\d+)-.*/.exec(format);
	if (matches) {
		const [, blockWidth, blockHeight] = matches;
		return {
			blockWidth: Number(blockWidth),
			blockHeight: Number(blockHeight)
		};
	}
	if (format.startsWith("bc") || format.startsWith("etc1") || format.startsWith("etc2") || format.startsWith("eac") || format.startsWith("atc")) return {
		blockWidth: 4,
		blockHeight: 4
	};
	if (format.startsWith("pvrtc-rgb4") || format.startsWith("pvrtc-rgba4")) return {
		blockWidth: 4,
		blockHeight: 4
	};
	if (format.startsWith("pvrtc-rgb2") || format.startsWith("pvrtc-rgba2")) return {
		blockWidth: 8,
		blockHeight: 4
	};
	return null;
}
function getCompressedTextureBlockByteLength(format) {
	if (format.startsWith("bc1") || format.startsWith("bc4") || format.startsWith("etc1") || format.startsWith("etc2-rgb8") || format.startsWith("etc2-rgb8a1") || format.startsWith("eac-r11") || format === "atc-rgb-unorm-webgl") return 8;
	if (format.startsWith("bc2") || format.startsWith("bc3") || format.startsWith("bc5") || format.startsWith("bc6h") || format.startsWith("bc7") || format.startsWith("etc2-rgba8") || format.startsWith("eac-rg11") || format.startsWith("astc") || format === "atc-rgba-unorm-webgl" || format === "atc-rgbai-unorm-webgl") return 16;
	if (format.startsWith("pvrtc")) return 8;
	return 16;
}
//#endregion
//#region node_modules/@luma.gl/core/dist/shadertypes/image-types/image-types.js
/** Check if data is an external image */
function isExternalImage(data) {
	return typeof ImageData !== "undefined" && data instanceof ImageData || typeof ImageBitmap !== "undefined" && data instanceof ImageBitmap || typeof HTMLImageElement !== "undefined" && data instanceof HTMLImageElement || typeof HTMLVideoElement !== "undefined" && data instanceof HTMLVideoElement || typeof VideoFrame !== "undefined" && data instanceof VideoFrame || typeof HTMLCanvasElement !== "undefined" && data instanceof HTMLCanvasElement || typeof OffscreenCanvas !== "undefined" && data instanceof OffscreenCanvas;
}
/** Determine size (width and height) of provided image data */
function getExternalImageSize(data) {
	if (typeof ImageData !== "undefined" && data instanceof ImageData || typeof ImageBitmap !== "undefined" && data instanceof ImageBitmap || typeof HTMLCanvasElement !== "undefined" && data instanceof HTMLCanvasElement || typeof OffscreenCanvas !== "undefined" && data instanceof OffscreenCanvas) return {
		width: data.width,
		height: data.height
	};
	if (typeof HTMLImageElement !== "undefined" && data instanceof HTMLImageElement) return {
		width: data.naturalWidth,
		height: data.naturalHeight
	};
	if (typeof HTMLVideoElement !== "undefined" && data instanceof HTMLVideoElement) return {
		width: data.videoWidth,
		height: data.videoHeight
	};
	if (typeof VideoFrame !== "undefined" && data instanceof VideoFrame) return {
		width: data.displayWidth,
		height: data.displayHeight
	};
	throw new Error("Unknown image type");
}
//#endregion
//#region node_modules/@luma.gl/core/dist/adapter/resources/sampler.js
/** Immutable Sampler object */
var Sampler = class Sampler extends Resource {
	static defaultProps = {
		...Resource.defaultProps,
		type: "color-sampler",
		addressModeU: "clamp-to-edge",
		addressModeV: "clamp-to-edge",
		addressModeW: "clamp-to-edge",
		magFilter: "nearest",
		minFilter: "nearest",
		mipmapFilter: "none",
		lodMinClamp: 0,
		lodMaxClamp: 32,
		compare: "less-equal",
		maxAnisotropy: 1
	};
	get [Symbol.toStringTag]() {
		return "Sampler";
	}
	constructor(device, props) {
		props = Sampler.normalizeProps(device, props);
		super(device, props, Sampler.defaultProps);
	}
	static normalizeProps(device, props) {
		return props;
	}
};
//#endregion
//#region node_modules/@luma.gl/core/dist/adapter/resources/texture.js
var BASE_DIMENSIONS = {
	"1d": "1d",
	"2d": "2d",
	"2d-array": "2d",
	cube: "2d",
	"cube-array": "2d",
	"3d": "3d"
};
/**
* Abstract Texture interface
* Texture Object
* https://gpuweb.github.io/gpuweb/#gputexture
*/
var Texture = class Texture extends Resource {
	/** The texture can be bound for use as a sampled texture in a shader */
	static SAMPLE = 4;
	/** The texture can be bound for use as a storage texture in a shader */
	static STORAGE = 8;
	/** The texture can be used as a color or depth/stencil attachment in a render pass */
	static RENDER = 16;
	/** The texture can be used as the source of a copy operation */
	static COPY_SRC = 1;
	/** he texture can be used as the destination of a copy or write operation */
	static COPY_DST = 2;
	/** @deprecated Use Texture.SAMPLE */
	static TEXTURE = 4;
	/** @deprecated Use Texture.RENDER */
	static RENDER_ATTACHMENT = 16;
	/** dimension of this texture */
	dimension;
	/** base dimension of this texture */
	baseDimension;
	/** format of this texture */
	format;
	/** width in pixels of this texture */
	width;
	/** height in pixels of this texture */
	height;
	/** depth of this texture */
	depth;
	/** mip levels in this texture */
	mipLevels;
	/** sample count */
	samples;
	/** Rows are multiples of this length, padded with extra bytes if needed */
	byteAlignment;
	/** The ready promise is always resolved. It is provided for type compatibility with DynamicTexture. */
	ready = Promise.resolve(this);
	/** isReady is always true. It is provided for type compatibility with DynamicTexture. */
	isReady = true;
	/** "Time" of last update. Monotonically increasing timestamp. TODO move to DynamicTexture? */
	updateTimestamp;
	get [Symbol.toStringTag]() {
		return "Texture";
	}
	toString() {
		return `Texture(${this.id},${this.format},${this.width}x${this.height})`;
	}
	/** Do not use directly. Create with device.createTexture() */
	constructor(device, props, backendProps) {
		props = Texture.normalizeProps(device, props);
		super(device, props, Texture.defaultProps);
		this.dimension = this.props.dimension;
		this.baseDimension = BASE_DIMENSIONS[this.dimension];
		this.format = this.props.format;
		this.width = this.props.width;
		this.height = this.props.height;
		this.depth = this.props.depth;
		this.mipLevels = this.props.mipLevels;
		this.samples = this.props.samples || 1;
		if (this.dimension === "cube") this.depth = 6;
		if (this.props.width === void 0 || this.props.height === void 0) if (device.isExternalImage(props.data)) {
			const size = device.getExternalImageSize(props.data);
			this.width = size?.width || 1;
			this.height = size?.height || 1;
		} else {
			this.width = 1;
			this.height = 1;
			if (this.props.width === void 0 || this.props.height === void 0) log.warn(`${this} created with undefined width or height. This is deprecated. Use DynamicTexture instead.`)();
		}
		this.byteAlignment = backendProps?.byteAlignment || 1;
		this.updateTimestamp = device.incrementTimestamp();
	}
	/**
	* Create a new texture with the same parameters and optionally a different size
	* @note Textures are immutable and cannot be resized after creation, but we can create a similar texture with the same parameters but a new size.
	* @note Does not copy contents of the texture
	*/
	clone(size) {
		return this.device.createTexture({
			...this.props,
			...size
		});
	}
	/** Set sampler props associated with this texture */
	setSampler(sampler) {
		this.sampler = sampler instanceof Sampler ? sampler : this.device.createSampler(sampler);
	}
	/**
	* Copy raw image data (bytes) into the texture.
	*
	* @note Deprecated compatibility wrapper over {@link writeData}.
	* @note Uses the same layout defaults and alignment rules as {@link writeData}.
	* @note Tightly packed CPU uploads can omit `bytesPerRow` and `rowsPerImage`.
	* @note If the CPU source rows are padded, pass explicit `bytesPerRow` and `rowsPerImage`.
	* @deprecated Use writeData()
	*/
	copyImageData(options) {
		const { data, depth, ...writeOptions } = options;
		this.writeData(data, {
			...writeOptions,
			depthOrArrayLayers: writeOptions.depthOrArrayLayers ?? depth
		});
	}
	/**
	* Calculates the memory layout of the texture, required when reading and writing data.
	* @return the backend-aligned linear layout, in particular bytesPerRow which includes any required padding for buffer copy/read paths
	*/
	computeMemoryLayout(options_ = {}) {
		const { width = this.width, height = this.height, depthOrArrayLayers = this.depth } = this._normalizeTextureReadOptions(options_);
		const { format, byteAlignment } = this;
		return textureFormatDecoder.computeMemoryLayout({
			format,
			width,
			height,
			depth: depthOrArrayLayers,
			byteAlignment
		});
	}
	/**
	* Read the contents of a texture into a GPU Buffer.
	* @returns A Buffer containing the texture data.
	*
	* @note The memory layout of the texture data is determined by the texture format and dimensions.
	* @note The application can call Texture.computeMemoryLayout() to compute the backend-aligned layout.
	* @note The application can call Buffer.readAsync() to read the returned buffer on the CPU.
	* @note The destination buffer must be supplied by the caller and must be large enough for the requested region.
	* @note On WebGPU this corresponds to a texture-to-buffer copy and uses buffer-copy alignment rules.
	* @note On WebGL, luma.gl emulates the same logical readback behavior.
	*/
	readBuffer(options, buffer) {
		throw new Error("readBuffer not implemented");
	}
	/**
	* Reads data from a texture into an ArrayBuffer.
	* @returns An ArrayBuffer containing the texture data.
	*
	* @note The memory layout of the texture data is determined by the texture format and dimensions.
	* @note The application can call Texture.computeMemoryLayout() to compute the layout.
	* @deprecated Use Texture.readBuffer() with an explicit destination buffer, or DynamicTexture.readAsync() for convenience readback.
	*/
	readDataAsync(options) {
		throw new Error("readBuffer not implemented");
	}
	/**
	* Writes a GPU Buffer into a texture.
	*
	* @param buffer - Source GPU buffer.
	* @param options - Destination subresource, extent, and source layout options.
	* @note The memory layout of the texture data is determined by the texture format and dimensions.
	* @note The application can call Texture.computeMemoryLayout() to compute the backend-aligned layout.
	* @note On WebGPU this corresponds to a buffer-to-texture copy and uses buffer-copy alignment rules.
	* @note On WebGL, luma.gl emulates the same destination and layout semantics.
	*/
	writeBuffer(buffer, options) {
		throw new Error("readBuffer not implemented");
	}
	/**
	* Writes an array buffer into a texture.
	*
	* @param data - Source texel data.
	* @param options - Destination subresource, extent, and source layout options.
	* @note If `bytesPerRow` and `rowsPerImage` are omitted, luma.gl computes a tightly packed CPU-memory layout for the requested region.
	* @note On WebGPU this corresponds to `GPUQueue.writeTexture()` and does not implicitly pad rows to 256 bytes.
	* @note On WebGL, padded CPU data is supported via the same `bytesPerRow` and `rowsPerImage` options.
	*/
	writeData(data, options) {
		throw new Error("readBuffer not implemented");
	}
	/**
	* WebGL can read data synchronously.
	* @note While it is convenient, the performance penalty is very significant
	*/
	readDataSyncWebGL(options) {
		throw new Error("readDataSyncWebGL not available");
	}
	/** Generate mipmaps (WebGL only) */
	generateMipmapsWebGL() {
		throw new Error("generateMipmapsWebGL not available");
	}
	/** Ensure we have integer coordinates */
	static normalizeProps(device, props) {
		const newProps = { ...props };
		const { width, height } = newProps;
		if (typeof width === "number") newProps.width = Math.max(1, Math.ceil(width));
		if (typeof height === "number") newProps.height = Math.max(1, Math.ceil(height));
		return newProps;
	}
	/** Initialize texture with supplied props */
	_initializeData(data) {
		if (this.device.isExternalImage(data)) this.copyExternalImage({
			image: data,
			width: this.width,
			height: this.height,
			depth: this.depth,
			mipLevel: 0,
			x: 0,
			y: 0,
			z: 0,
			aspect: "all",
			colorSpace: "srgb",
			premultipliedAlpha: false,
			flipY: false
		});
		else if (data) this.copyImageData({
			data,
			mipLevel: 0,
			x: 0,
			y: 0,
			z: 0,
			aspect: "all"
		});
	}
	_normalizeCopyImageDataOptions(options_) {
		const { data, depth, ...writeOptions } = options_;
		const options = this._normalizeTextureWriteOptions({
			...writeOptions,
			depthOrArrayLayers: writeOptions.depthOrArrayLayers ?? depth
		});
		return {
			data,
			depth: options.depthOrArrayLayers,
			...options
		};
	}
	_normalizeCopyExternalImageOptions(options_) {
		const optionsWithoutUndefined = Texture._omitUndefined(options_);
		const mipLevel = optionsWithoutUndefined.mipLevel ?? 0;
		const mipLevelSize = this._getMipLevelSize(mipLevel);
		const size = this.device.getExternalImageSize(options_.image);
		const options = {
			...Texture.defaultCopyExternalImageOptions,
			...mipLevelSize,
			...size,
			...optionsWithoutUndefined
		};
		options.width = Math.min(options.width, mipLevelSize.width - options.x);
		options.height = Math.min(options.height, mipLevelSize.height - options.y);
		options.depth = Math.min(options.depth, mipLevelSize.depthOrArrayLayers - options.z);
		return options;
	}
	_normalizeTextureReadOptions(options_) {
		const optionsWithoutUndefined = Texture._omitUndefined(options_);
		const mipLevel = optionsWithoutUndefined.mipLevel ?? 0;
		const mipLevelSize = this._getMipLevelSize(mipLevel);
		const options = {
			...Texture.defaultTextureReadOptions,
			...mipLevelSize,
			...optionsWithoutUndefined
		};
		options.width = Math.min(options.width, mipLevelSize.width - options.x);
		options.height = Math.min(options.height, mipLevelSize.height - options.y);
		options.depthOrArrayLayers = Math.min(options.depthOrArrayLayers, mipLevelSize.depthOrArrayLayers - options.z);
		return options;
	}
	/**
	* Normalizes a texture read request and validates the color-only readback contract used by the
	* current texture read APIs. Supported dimensions are `2d`, `cube`, `cube-array`,
	* `2d-array`, and `3d`.
	*
	* @throws if the texture format, aspect, or dimension is not supported by the first-pass
	* color-read implementation.
	*/
	_getSupportedColorReadOptions(options_) {
		const options = this._normalizeTextureReadOptions(options_);
		const formatInfo = textureFormatDecoder.getInfo(this.format);
		this._validateColorReadAspect(options);
		this._validateColorReadFormat(formatInfo);
		switch (this.dimension) {
			case "2d":
			case "cube":
			case "cube-array":
			case "2d-array":
			case "3d": return options;
			default: throw new Error(`${this} color readback does not support ${this.dimension} textures`);
		}
	}
	/** Validates that a read request targets the full color aspect of the texture. */
	_validateColorReadAspect(options) {
		if (options.aspect !== "all") throw new Error(`${this} color readback only supports aspect 'all'`);
	}
	/** Validates that a read request targets an uncompressed color-renderable texture format. */
	_validateColorReadFormat(formatInfo) {
		if (formatInfo.compressed) throw new Error(`${this} color readback does not support compressed formats (${this.format})`);
		switch (formatInfo.attachment) {
			case "color": return;
			case "depth": throw new Error(`${this} color readback does not support depth formats (${this.format})`);
			case "stencil": throw new Error(`${this} color readback does not support stencil formats (${this.format})`);
			case "depth-stencil": throw new Error(`${this} color readback does not support depth-stencil formats (${this.format})`);
			default: throw new Error(`${this} color readback does not support format ${this.format}`);
		}
	}
	_normalizeTextureWriteOptions(options_) {
		const optionsWithoutUndefined = Texture._omitUndefined(options_);
		const mipLevel = optionsWithoutUndefined.mipLevel ?? 0;
		const mipLevelSize = this._getMipLevelSize(mipLevel);
		const options = {
			...Texture.defaultTextureWriteOptions,
			...mipLevelSize,
			...optionsWithoutUndefined
		};
		options.width = Math.min(options.width, mipLevelSize.width - options.x);
		options.height = Math.min(options.height, mipLevelSize.height - options.y);
		options.depthOrArrayLayers = Math.min(options.depthOrArrayLayers, mipLevelSize.depthOrArrayLayers - options.z);
		const layout = textureFormatDecoder.computeMemoryLayout({
			format: this.format,
			width: options.width,
			height: options.height,
			depth: options.depthOrArrayLayers,
			byteAlignment: this.byteAlignment
		});
		const minimumBytesPerRow = layout.bytesPerPixel * options.width;
		options.bytesPerRow = optionsWithoutUndefined.bytesPerRow ?? layout.bytesPerRow;
		options.rowsPerImage = optionsWithoutUndefined.rowsPerImage ?? options.height;
		if (options.bytesPerRow < minimumBytesPerRow) throw new Error(`bytesPerRow (${options.bytesPerRow}) must be at least ${minimumBytesPerRow} for ${this.format}`);
		if (options.rowsPerImage < options.height) throw new Error(`rowsPerImage (${options.rowsPerImage}) must be at least ${options.height} for ${this.format}`);
		const bytesPerPixel = this.device.getTextureFormatInfo(this.format).bytesPerPixel;
		if (bytesPerPixel && options.bytesPerRow % bytesPerPixel !== 0) throw new Error(`bytesPerRow (${options.bytesPerRow}) must be a multiple of bytesPerPixel (${bytesPerPixel}) for ${this.format}`);
		return options;
	}
	_getMipLevelSize(mipLevel) {
		return {
			width: Math.max(1, this.width >> mipLevel),
			height: this.baseDimension === "1d" ? 1 : Math.max(1, this.height >> mipLevel),
			depthOrArrayLayers: this.dimension === "3d" ? Math.max(1, this.depth >> mipLevel) : this.depth
		};
	}
	getAllocatedByteLength() {
		let allocatedByteLength = 0;
		for (let mipLevel = 0; mipLevel < this.mipLevels; mipLevel++) {
			const { width, height, depthOrArrayLayers } = this._getMipLevelSize(mipLevel);
			allocatedByteLength += textureFormatDecoder.computeMemoryLayout({
				format: this.format,
				width,
				height,
				depth: depthOrArrayLayers,
				byteAlignment: 1
			}).byteLength;
		}
		return allocatedByteLength * this.samples;
	}
	static _omitUndefined(options) {
		return Object.fromEntries(Object.entries(options).filter(([, value]) => value !== void 0));
	}
	static defaultProps = {
		...Resource.defaultProps,
		data: null,
		dimension: "2d",
		format: "rgba8unorm",
		usage: Texture.SAMPLE | Texture.RENDER | Texture.COPY_DST,
		width: void 0,
		height: void 0,
		depth: 1,
		mipLevels: 1,
		samples: void 0,
		sampler: {},
		view: void 0
	};
	static defaultCopyDataOptions = {
		data: void 0,
		byteOffset: 0,
		bytesPerRow: void 0,
		rowsPerImage: void 0,
		width: void 0,
		height: void 0,
		depthOrArrayLayers: void 0,
		depth: 1,
		mipLevel: 0,
		x: 0,
		y: 0,
		z: 0,
		aspect: "all"
	};
	/** Default options */
	static defaultCopyExternalImageOptions = {
		image: void 0,
		sourceX: 0,
		sourceY: 0,
		width: void 0,
		height: void 0,
		depth: 1,
		mipLevel: 0,
		x: 0,
		y: 0,
		z: 0,
		aspect: "all",
		colorSpace: "srgb",
		premultipliedAlpha: false,
		flipY: false
	};
	static defaultTextureReadOptions = {
		x: 0,
		y: 0,
		z: 0,
		width: void 0,
		height: void 0,
		depthOrArrayLayers: 1,
		mipLevel: 0,
		aspect: "all"
	};
	static defaultTextureWriteOptions = {
		byteOffset: 0,
		bytesPerRow: void 0,
		rowsPerImage: void 0,
		x: 0,
		y: 0,
		z: 0,
		width: void 0,
		height: void 0,
		depthOrArrayLayers: 1,
		mipLevel: 0,
		aspect: "all"
	};
};
//#endregion
//#region node_modules/@luma.gl/core/dist/adapter/resources/texture-view.js
/** Immutable TextureView object */
var TextureView = class TextureView extends Resource {
	get [Symbol.toStringTag]() {
		return "TextureView";
	}
	/** Should not be constructed directly. Use `texture.createView(props)` */
	constructor(device, props) {
		super(device, props, TextureView.defaultProps);
	}
	static defaultProps = {
		...Resource.defaultProps,
		format: void 0,
		dimension: void 0,
		aspect: "all",
		baseMipLevel: 0,
		mipLevelCount: void 0,
		baseArrayLayer: 0,
		arrayLayerCount: void 0
	};
};
//#endregion
//#region node_modules/@luma.gl/core/dist/adapter-utils/format-compiler-log.js
/** @returns annotated errors or warnings */
function formatCompilerLog(shaderLog, source, options) {
	let formattedLog = "";
	const lines = source.split(/\r?\n/);
	const log = shaderLog.slice().sort((a, b) => a.lineNum - b.lineNum);
	switch (options?.showSourceCode || "no") {
		case "all":
			let currentMessageIndex = 0;
			for (let lineNum = 1; lineNum <= lines.length; lineNum++) {
				const line = lines[lineNum - 1];
				const currentMessage = log[currentMessageIndex];
				if (line && currentMessage) formattedLog += getNumberedLine(line, lineNum, options);
				while (log.length > currentMessageIndex && currentMessage.lineNum === lineNum) {
					const message = log[currentMessageIndex++];
					if (message) formattedLog += formatCompilerMessage(message, lines, message.lineNum, {
						...options,
						inlineSource: false
					});
				}
			}
			while (log.length > currentMessageIndex) {
				const message = log[currentMessageIndex++];
				if (message) formattedLog += formatCompilerMessage(message, [], 0, {
					...options,
					inlineSource: false
				});
			}
			return formattedLog;
		case "issues":
		case "no":
			for (const message of shaderLog) formattedLog += formatCompilerMessage(message, lines, message.lineNum, { inlineSource: options?.showSourceCode !== "no" });
			return formattedLog;
	}
}
/** Format one message */
function formatCompilerMessage(message, lines, lineNum, options) {
	if (options?.inlineSource) return `
${getNumberedLines(lines, lineNum)}${message.linePos > 0 ? `${" ".repeat(message.linePos + 5)}^^^\n` : ""}${message.type.toUpperCase()}: ${message.message}

`;
	const color = message.type === "error" ? "red" : "orange";
	return options?.html ? `<div class='luma-compiler-log-${message.type}' style="color:${color};"><b> ${message.type.toUpperCase()}: ${message.message}</b></div>` : `${message.type.toUpperCase()}: ${message.message}`;
}
function getNumberedLines(lines, lineNum, options) {
	let numberedLines = "";
	for (let lineIndex = lineNum - 2; lineIndex <= lineNum; lineIndex++) {
		const sourceLine = lines[lineIndex - 1];
		if (sourceLine !== void 0) numberedLines += getNumberedLine(sourceLine, lineNum, options);
	}
	return numberedLines;
}
function getNumberedLine(line, lineNum, options) {
	const escapedLine = options?.html ? escapeHTML(line) : line;
	return `${padLeft(String(lineNum), 4)}: ${escapedLine}${options?.html ? "<br/>" : "\n"}`;
}
/**
* Pads a string with a number of spaces (space characters) to the left
* @param {String} string - string to pad
* @param {Number} digits - number of spaces to add
* @return {String} string - The padded string
*/
function padLeft(string, paddedLength) {
	let result = "";
	for (let i = string.length; i < paddedLength; ++i) result += " ";
	return result + string;
}
function escapeHTML(unsafe) {
	return unsafe.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;").replaceAll("'", "&#039;");
}
//#endregion
//#region node_modules/@luma.gl/core/dist/adapter/resources/shader.js
/**
* Immutable Shader object
* In WebGPU the handle can be copied between threads
*/
var Shader = class Shader extends Resource {
	get [Symbol.toStringTag]() {
		return "Shader";
	}
	/** The stage of this shader */
	stage;
	/** The source code of this shader */
	source;
	/** The compilation status of the shader. 'pending' if compilation is asynchronous, and on production */
	compilationStatus = "pending";
	/** Create a new Shader instance */
	constructor(device, props) {
		props = {
			...props,
			debugShaders: props.debugShaders || device.props.debugShaders || "errors"
		};
		super(device, {
			id: getShaderIdFromProps(props),
			...props
		}, Shader.defaultProps);
		this.stage = this.props.stage;
		this.source = this.props.source;
	}
	/** Get compiler log synchronously (WebGL only) */
	getCompilationInfoSync() {
		return null;
	}
	/** Get translated shader source in host platform's native language (HLSL, GLSL, and even GLSL ES), if available */
	getTranslatedSource() {
		return null;
	}
	/** In browser logging of errors */
	async debugShader() {
		const trigger = this.props.debugShaders;
		switch (trigger) {
			case "never": return;
			case "errors":
				if (this.compilationStatus === "success") return;
				break;
			case "warnings":
			case "always": break;
		}
		const messages = await this.getCompilationInfo();
		if (trigger === "warnings" && messages?.length === 0) return;
		this._displayShaderLog(messages, this.id);
	}
	/**
	* In-browser UI logging of errors
	* TODO - this HTML formatting code should not be in Device, should be pluggable
	*/
	_displayShaderLog(messages, shaderId) {
		if (typeof document === "undefined" || !document?.createElement) return;
		const shaderName = shaderId;
		const shaderTitle = `${this.stage} shader "${shaderName}"`;
		const htmlLog = formatCompilerLog(messages, this.source, {
			showSourceCode: "all",
			html: true
		});
		const translatedSource = this.getTranslatedSource();
		const container = document.createElement("div");
		container.innerHTML = `\
<h1>Compilation error in ${shaderTitle}</h1>
<div style="display:flex;position:fixed;top:10px;right:20px;gap:2px;">
<button id="copy">Copy source</button><br/>
<button id="close">Close</button>
</div>
<code><pre>${htmlLog}</pre></code>`;
		if (translatedSource) container.innerHTML += `<br /><h1>Translated Source</h1><br /><br /><code><pre>${translatedSource}</pre></code>`;
		container.style.top = "0";
		container.style.left = "0";
		container.style.background = "white";
		container.style.position = "fixed";
		container.style.zIndex = "9999";
		container.style.maxWidth = "100vw";
		container.style.maxHeight = "100vh";
		container.style.overflowY = "auto";
		document.body.appendChild(container);
		container.querySelector(".luma-compiler-log-error")?.scrollIntoView();
		container.querySelector("button#close").onclick = () => {
			container.remove();
		};
		container.querySelector("button#copy").onclick = () => {
			navigator.clipboard.writeText(this.source);
		};
	}
	static defaultProps = {
		...Resource.defaultProps,
		language: "auto",
		stage: void 0,
		source: "",
		sourceMap: null,
		entryPoint: "main",
		debugShaders: void 0
	};
};
/** Deduce an id, from shader source, or supplied id, or shader type */
function getShaderIdFromProps(props) {
	return getShaderName(props.source) || props.id || uid(`unnamed ${props.stage}-shader`);
}
/** Extracts GLSLIFY style naming of shaders: `#define SHADER_NAME ...` */
function getShaderName(shader, defaultName = "unnamed") {
	return /#define[\s*]SHADER_NAME[\s*]([A-Za-z0-9_-]+)[\s*]/.exec(shader)?.[1] ?? defaultName;
}
//#endregion
//#region node_modules/@luma.gl/core/dist/adapter/resources/render-pipeline.js
/**
* A compiled and linked shader program
*/
var RenderPipeline = class RenderPipeline extends Resource {
	get [Symbol.toStringTag]() {
		return "RenderPipeline";
	}
	/** The merged layout */
	shaderLayout;
	/** Buffer map describing buffer interleaving etc */
	bufferLayout;
	/** The linking status of the pipeline. 'pending' if linking is asynchronous, and on production */
	linkStatus = "pending";
	/** The hash of the pipeline */
	hash = "";
	/** Optional shared backend implementation */
	sharedRenderPipeline = null;
	/** Whether shader or pipeline compilation/linking is still in progress */
	get isPending() {
		return this.linkStatus === "pending" || this.vs.compilationStatus === "pending" || this.fs?.compilationStatus === "pending";
	}
	/** Whether shader or pipeline compilation/linking has failed */
	get isErrored() {
		return this.linkStatus === "error" || this.vs.compilationStatus === "error" || this.fs?.compilationStatus === "error";
	}
	constructor(device, props) {
		super(device, props, RenderPipeline.defaultProps);
		this.shaderLayout = this.props.shaderLayout;
		this.bufferLayout = this.props.bufferLayout || [];
		this.sharedRenderPipeline = this.props._sharedRenderPipeline || null;
	}
	static defaultProps = {
		...Resource.defaultProps,
		vs: null,
		vertexEntryPoint: "vertexMain",
		vsConstants: {},
		fs: null,
		fragmentEntryPoint: "fragmentMain",
		fsConstants: {},
		shaderLayout: null,
		bufferLayout: [],
		topology: "triangle-list",
		colorAttachmentFormats: void 0,
		depthStencilAttachmentFormat: void 0,
		parameters: {},
		varyings: void 0,
		bufferMode: void 0,
		disableWarnings: false,
		_sharedRenderPipeline: void 0,
		bindings: void 0,
		bindGroups: void 0
	};
};
//#endregion
//#region node_modules/@luma.gl/core/dist/adapter-utils/bind-groups.js
function getShaderLayoutBinding(shaderLayout, bindingName, options) {
	const bindingLayout = shaderLayout.bindings.find((binding) => binding.name === bindingName || `${binding.name.toLocaleLowerCase()}uniforms` === bindingName.toLocaleLowerCase());
	if (!bindingLayout && !options?.ignoreWarnings) log.warn(`Binding ${bindingName} not set: Not found in shader layout.`)();
	return bindingLayout || null;
}
function normalizeBindingsByGroup(shaderLayout, bindingsOrBindGroups) {
	if (!bindingsOrBindGroups) return {};
	if (areBindingsGrouped(bindingsOrBindGroups)) return Object.fromEntries(Object.entries(bindingsOrBindGroups).map(([group, bindings]) => [Number(group), { ...bindings }]));
	const bindGroups = {};
	for (const [bindingName, binding] of Object.entries(bindingsOrBindGroups)) {
		const group = getShaderLayoutBinding(shaderLayout, bindingName)?.group ?? 0;
		bindGroups[group] ||= {};
		bindGroups[group][bindingName] = binding;
	}
	return bindGroups;
}
function flattenBindingsByGroup(bindGroups) {
	const bindings = {};
	for (const groupBindings of Object.values(bindGroups)) Object.assign(bindings, groupBindings);
	return bindings;
}
function areBindingsGrouped(bindingsOrBindGroups) {
	const keys = Object.keys(bindingsOrBindGroups);
	return keys.length > 0 && keys.every((key) => /^\d+$/.test(key));
}
//#endregion
//#region node_modules/@luma.gl/core/dist/shadertypes/shader-types/shader-type-decoder.js
/** Split a uniform type string into type and components */
function getVariableShaderTypeInfo(format) {
	const decoded = UNIFORM_FORMATS[resolveVariableShaderTypeAlias(format)];
	if (!decoded) throw new Error(`Unsupported variable shader type: ${format}`);
	return decoded;
}
/** Decodes a vertex type, returning byte length and flags (integer, signed, normalized) */
function getAttributeShaderTypeInfo(attributeType) {
	const decoded = TYPE_INFO[resolveAttributeShaderTypeAlias(attributeType)];
	if (!decoded) throw new Error(`Unsupported attribute shader type: ${attributeType}`);
	const [primitiveType, components] = decoded;
	const integer = primitiveType === "i32" || primitiveType === "u32";
	const signed = primitiveType !== "u32";
	return {
		primitiveType,
		components,
		byteLength: PRIMITIVE_TYPE_SIZES[primitiveType] * components,
		integer,
		signed
	};
}
var ShaderTypeDecoder = class {
	getVariableShaderTypeInfo(format) {
		return getVariableShaderTypeInfo(format);
	}
	getAttributeShaderTypeInfo(attributeType) {
		return getAttributeShaderTypeInfo(attributeType);
	}
	makeShaderAttributeType(primitiveType, components) {
		return makeShaderAttributeType(primitiveType, components);
	}
	resolveAttributeShaderTypeAlias(alias) {
		return resolveAttributeShaderTypeAlias(alias);
	}
	resolveVariableShaderTypeAlias(alias) {
		return resolveVariableShaderTypeAlias(alias);
	}
};
function makeShaderAttributeType(primitiveType, components) {
	return components === 1 ? primitiveType : `vec${components}<${primitiveType}>`;
}
function resolveAttributeShaderTypeAlias(alias) {
	return WGSL_ATTRIBUTE_TYPE_ALIAS_MAP[alias] || alias;
}
function resolveVariableShaderTypeAlias(alias) {
	return WGSL_VARIABLE_TYPE_ALIAS_MAP[alias] || alias;
}
/** Decoder for luma.gl shader types */
var shaderTypeDecoder = new ShaderTypeDecoder();
var PRIMITIVE_TYPE_SIZES = {
	f32: 4,
	f16: 2,
	i32: 4,
	u32: 4
};
/** All valid shader attribute types. A table guarantees exhaustive list and fast execution */
var TYPE_INFO = {
	f32: ["f32", 1],
	"vec2<f32>": ["f32", 2],
	"vec3<f32>": ["f32", 3],
	"vec4<f32>": ["f32", 4],
	f16: ["f16", 1],
	"vec2<f16>": ["f16", 2],
	"vec3<f16>": ["f16", 3],
	"vec4<f16>": ["f16", 4],
	i32: ["i32", 1],
	"vec2<i32>": ["i32", 2],
	"vec3<i32>": ["i32", 3],
	"vec4<i32>": ["i32", 4],
	u32: ["u32", 1],
	"vec2<u32>": ["u32", 2],
	"vec3<u32>": ["u32", 3],
	"vec4<u32>": ["u32", 4]
};
/** @todo These tables are quite big, consider parsing type strings instead */
var UNIFORM_FORMATS = {
	f32: {
		type: "f32",
		components: 1
	},
	f16: {
		type: "f16",
		components: 1
	},
	i32: {
		type: "i32",
		components: 1
	},
	u32: {
		type: "u32",
		components: 1
	},
	"vec2<f32>": {
		type: "f32",
		components: 2
	},
	"vec3<f32>": {
		type: "f32",
		components: 3
	},
	"vec4<f32>": {
		type: "f32",
		components: 4
	},
	"vec2<f16>": {
		type: "f16",
		components: 2
	},
	"vec3<f16>": {
		type: "f16",
		components: 3
	},
	"vec4<f16>": {
		type: "f16",
		components: 4
	},
	"vec2<i32>": {
		type: "i32",
		components: 2
	},
	"vec3<i32>": {
		type: "i32",
		components: 3
	},
	"vec4<i32>": {
		type: "i32",
		components: 4
	},
	"vec2<u32>": {
		type: "u32",
		components: 2
	},
	"vec3<u32>": {
		type: "u32",
		components: 3
	},
	"vec4<u32>": {
		type: "u32",
		components: 4
	},
	"mat2x2<f32>": {
		type: "f32",
		components: 4
	},
	"mat2x3<f32>": {
		type: "f32",
		components: 6
	},
	"mat2x4<f32>": {
		type: "f32",
		components: 8
	},
	"mat3x2<f32>": {
		type: "f32",
		components: 6
	},
	"mat3x3<f32>": {
		type: "f32",
		components: 9
	},
	"mat3x4<f32>": {
		type: "f32",
		components: 12
	},
	"mat4x2<f32>": {
		type: "f32",
		components: 8
	},
	"mat4x3<f32>": {
		type: "f32",
		components: 12
	},
	"mat4x4<f32>": {
		type: "f32",
		components: 16
	},
	"mat2x2<f16>": {
		type: "f16",
		components: 4
	},
	"mat2x3<f16>": {
		type: "f16",
		components: 6
	},
	"mat2x4<f16>": {
		type: "f16",
		components: 8
	},
	"mat3x2<f16>": {
		type: "f16",
		components: 6
	},
	"mat3x3<f16>": {
		type: "f16",
		components: 9
	},
	"mat3x4<f16>": {
		type: "f16",
		components: 12
	},
	"mat4x2<f16>": {
		type: "f16",
		components: 8
	},
	"mat4x3<f16>": {
		type: "f16",
		components: 12
	},
	"mat4x4<f16>": {
		type: "f16",
		components: 16
	},
	"mat2x2<i32>": {
		type: "i32",
		components: 4
	},
	"mat2x3<i32>": {
		type: "i32",
		components: 6
	},
	"mat2x4<i32>": {
		type: "i32",
		components: 8
	},
	"mat3x2<i32>": {
		type: "i32",
		components: 6
	},
	"mat3x3<i32>": {
		type: "i32",
		components: 9
	},
	"mat3x4<i32>": {
		type: "i32",
		components: 12
	},
	"mat4x2<i32>": {
		type: "i32",
		components: 8
	},
	"mat4x3<i32>": {
		type: "i32",
		components: 12
	},
	"mat4x4<i32>": {
		type: "i32",
		components: 16
	},
	"mat2x2<u32>": {
		type: "u32",
		components: 4
	},
	"mat2x3<u32>": {
		type: "u32",
		components: 6
	},
	"mat2x4<u32>": {
		type: "u32",
		components: 8
	},
	"mat3x2<u32>": {
		type: "u32",
		components: 6
	},
	"mat3x3<u32>": {
		type: "u32",
		components: 9
	},
	"mat3x4<u32>": {
		type: "u32",
		components: 12
	},
	"mat4x2<u32>": {
		type: "u32",
		components: 8
	},
	"mat4x3<u32>": {
		type: "u32",
		components: 12
	},
	"mat4x4<u32>": {
		type: "u32",
		components: 16
	}
};
/**  Predeclared aliases @see https://www.w3.org/TR/WGSL/#vector-types */
var WGSL_ATTRIBUTE_TYPE_ALIAS_MAP = {
	vec2i: "vec2<i32>",
	vec3i: "vec3<i32>",
	vec4i: "vec4<i32>",
	vec2u: "vec2<u32>",
	vec3u: "vec3<u32>",
	vec4u: "vec4<u32>",
	vec2f: "vec2<f32>",
	vec3f: "vec3<f32>",
	vec4f: "vec4<f32>",
	vec2h: "vec2<f16>",
	vec3h: "vec3<f16>",
	vec4h: "vec4<f16>"
};
/** @todo These tables are quite big, consider parsing alias strings instead */
var WGSL_VARIABLE_TYPE_ALIAS_MAP = {
	vec2i: "vec2<i32>",
	vec3i: "vec3<i32>",
	vec4i: "vec4<i32>",
	vec2u: "vec2<u32>",
	vec3u: "vec3<u32>",
	vec4u: "vec4<u32>",
	vec2f: "vec2<f32>",
	vec3f: "vec3<f32>",
	vec4f: "vec4<f32>",
	vec2h: "vec2<f16>",
	vec3h: "vec3<f16>",
	vec4h: "vec4<f16>",
	mat2x2f: "mat2x2<f32>",
	mat2x3f: "mat2x3<f32>",
	mat2x4f: "mat2x4<f32>",
	mat3x2f: "mat3x2<f32>",
	mat3x3f: "mat3x3<f32>",
	mat3x4f: "mat3x4<f32>",
	mat4x2f: "mat4x2<f32>",
	mat4x3f: "mat4x3<f32>",
	mat4x4f: "mat4x4<f32>",
	mat2x2i: "mat2x2<i32>",
	mat2x3i: "mat2x3<i32>",
	mat2x4i: "mat2x4<i32>",
	mat3x2i: "mat3x2<i32>",
	mat3x3i: "mat3x3<i32>",
	mat3x4i: "mat3x4<i32>",
	mat4x2i: "mat4x2<i32>",
	mat4x3i: "mat4x3<i32>",
	mat4x4i: "mat4x4<i32>",
	mat2x2u: "mat2x2<u32>",
	mat2x3u: "mat2x3<u32>",
	mat2x4u: "mat2x4<u32>",
	mat3x2u: "mat3x2<u32>",
	mat3x3u: "mat3x3<u32>",
	mat3x4u: "mat3x4<u32>",
	mat4x2u: "mat4x2<u32>",
	mat4x3u: "mat4x3<u32>",
	mat4x4u: "mat4x4<u32>",
	mat2x2h: "mat2x2<f16>",
	mat2x3h: "mat2x3<f16>",
	mat2x4h: "mat2x4<f16>",
	mat3x2h: "mat3x2<f16>",
	mat3x3h: "mat3x3<f16>",
	mat3x4h: "mat3x4<f16>",
	mat4x2h: "mat4x2<f16>",
	mat4x3h: "mat4x3<f16>",
	mat4x4h: "mat4x4<f16>"
};
//#endregion
//#region node_modules/@luma.gl/core/dist/adapter-utils/get-attribute-from-layouts.js
/**
* Map from "attribute names" to "resolved attribute infos"
* containing information about both buffer layouts and shader attribute declarations
*/
function getAttributeInfosFromLayouts(shaderLayout, bufferLayout) {
	const attributeInfos = {};
	for (const attribute of shaderLayout.attributes) {
		const attributeInfo = getAttributeInfoFromLayouts(shaderLayout, bufferLayout, attribute.name);
		if (attributeInfo) attributeInfos[attribute.name] = attributeInfo;
	}
	return attributeInfos;
}
/**
* Array indexed by "location" holding "resolved attribute infos"
*/
function getAttributeInfosByLocation(shaderLayout, bufferLayout, maxVertexAttributes = 16) {
	const attributeInfos = getAttributeInfosFromLayouts(shaderLayout, bufferLayout);
	const locationInfos = new Array(maxVertexAttributes).fill(null);
	for (const attributeInfo of Object.values(attributeInfos)) locationInfos[attributeInfo.location] = attributeInfo;
	return locationInfos;
}
/**
* Get the combined information from a shader layout and a buffer layout for a specific attribute
*/
function getAttributeInfoFromLayouts(shaderLayout, bufferLayout, name) {
	const shaderDeclaration = getAttributeFromShaderLayout(shaderLayout, name);
	const bufferMapping = getAttributeFromBufferLayout(bufferLayout, name);
	if (!shaderDeclaration) return null;
	const attributeTypeInfo = shaderTypeDecoder.getAttributeShaderTypeInfo(shaderDeclaration.type);
	const defaultVertexFormat = vertexFormatDecoder.getCompatibleVertexFormat(attributeTypeInfo);
	const vertexFormat = bufferMapping?.vertexFormat || defaultVertexFormat;
	const vertexFormatInfo = vertexFormatDecoder.getVertexFormatInfo(vertexFormat);
	return {
		attributeName: bufferMapping?.attributeName || shaderDeclaration.name,
		bufferName: bufferMapping?.bufferName || shaderDeclaration.name,
		location: shaderDeclaration.location,
		shaderType: shaderDeclaration.type,
		primitiveType: attributeTypeInfo.primitiveType,
		shaderComponents: attributeTypeInfo.components,
		vertexFormat,
		bufferDataType: vertexFormatInfo.type,
		bufferComponents: vertexFormatInfo.components,
		normalized: vertexFormatInfo.normalized,
		integer: attributeTypeInfo.integer,
		stepMode: bufferMapping?.stepMode || shaderDeclaration.stepMode || "vertex",
		byteOffset: bufferMapping?.byteOffset || 0,
		byteStride: bufferMapping?.byteStride || 0
	};
}
function getAttributeFromShaderLayout(shaderLayout, name) {
	const attribute = shaderLayout.attributes.find((attr) => attr.name === name);
	if (!attribute) log.warn(`shader layout attribute "${name}" not present in shader`);
	return attribute || null;
}
function getAttributeFromBufferLayout(bufferLayouts, name) {
	checkBufferLayouts(bufferLayouts);
	let bufferLayoutInfo = getAttributeFromShortHand(bufferLayouts, name);
	if (bufferLayoutInfo) return bufferLayoutInfo;
	bufferLayoutInfo = getAttributeFromAttributesList(bufferLayouts, name);
	if (bufferLayoutInfo) return bufferLayoutInfo;
	log.warn(`layout for attribute "${name}" not present in buffer layout`);
	return null;
}
/** Check that bufferLayouts are valid (each either has format or attribute) */
function checkBufferLayouts(bufferLayouts) {
	for (const bufferLayout of bufferLayouts) if (bufferLayout.attributes && bufferLayout.format || !bufferLayout.attributes && !bufferLayout.format) log.warn(`BufferLayout ${name} must have either 'attributes' or 'format' field`);
}
/** Get attribute from format shorthand if specified */
function getAttributeFromShortHand(bufferLayouts, name) {
	for (const bufferLayout of bufferLayouts) if (bufferLayout.format && bufferLayout.name === name) return {
		attributeName: bufferLayout.name,
		bufferName: name,
		stepMode: bufferLayout.stepMode,
		vertexFormat: bufferLayout.format,
		byteOffset: 0,
		byteStride: bufferLayout.byteStride || 0
	};
	return null;
}
/**
* Search attribute mappings (e.g. interleaved attributes) for buffer mapping.
* Not the name of the buffer might be the same as one of the interleaved attributes.
*/
function getAttributeFromAttributesList(bufferLayouts, name) {
	for (const bufferLayout of bufferLayouts) {
		let byteStride = bufferLayout.byteStride;
		if (typeof bufferLayout.byteStride !== "number") for (const attributeMapping of bufferLayout.attributes || []) {
			const info = vertexFormatDecoder.getVertexFormatInfo(attributeMapping.format);
			byteStride += info.byteLength;
		}
		const attributeMapping = bufferLayout.attributes?.find((mapping) => mapping.attribute === name);
		if (attributeMapping) return {
			attributeName: attributeMapping.attribute,
			bufferName: bufferLayout.name,
			stepMode: bufferLayout.stepMode,
			vertexFormat: attributeMapping.format,
			byteOffset: attributeMapping.byteOffset,
			byteStride
		};
	}
	return null;
}
//#endregion
//#region node_modules/@luma.gl/core/dist/shadertypes/data-types/decode-data-types.js
/** Align offset to 1, 2 or 4 elements (4, 8 or 16 bytes) */
function alignTo(size, count) {
	switch (count) {
		case 1: return size;
		case 2: return size + size % 2;
		default: return size + (4 - size % 4) % 4;
	}
}
/** Returns the TypedArray that corresponds to a shader data type */
function getTypedArrayConstructor(type) {
	const [, , , , Constructor] = NORMALIZED_TYPE_MAP[type];
	return Constructor;
}
var NORMALIZED_TYPE_MAP = {
	uint8: [
		"uint8",
		"u32",
		1,
		false,
		Uint8Array
	],
	sint8: [
		"sint8",
		"i32",
		1,
		false,
		Int8Array
	],
	unorm8: [
		"uint8",
		"f32",
		1,
		true,
		Uint8Array
	],
	snorm8: [
		"sint8",
		"f32",
		1,
		true,
		Int8Array
	],
	uint16: [
		"uint16",
		"u32",
		2,
		false,
		Uint16Array
	],
	sint16: [
		"sint16",
		"i32",
		2,
		false,
		Int16Array
	],
	unorm16: [
		"uint16",
		"u32",
		2,
		true,
		Uint16Array
	],
	snorm16: [
		"sint16",
		"i32",
		2,
		true,
		Int16Array
	],
	float16: [
		"float16",
		"f16",
		2,
		false,
		Uint16Array
	],
	float32: [
		"float32",
		"f32",
		4,
		false,
		Float32Array
	],
	uint32: [
		"uint32",
		"u32",
		4,
		false,
		Uint32Array
	],
	sint32: [
		"sint32",
		"i32",
		4,
		false,
		Int32Array
	]
};
//#endregion
//#region node_modules/@luma.gl/core/dist/utils/array-utils-flat.js
var arrayBuffer;
function getScratchArrayBuffer(byteLength) {
	if (!arrayBuffer || arrayBuffer.byteLength < byteLength) arrayBuffer = new ArrayBuffer(byteLength);
	return arrayBuffer;
}
function getScratchArray(Type, length) {
	return new Type(getScratchArrayBuffer(Type.BYTES_PER_ELEMENT * length), 0, length);
}
//#endregion
export { Resource as C, getBrowser as D, ProbeLog as E, isBrowser as O, Buffer as S, log as T, isExternalImage as _, getAttributeInfosByLocation as a, vertexFormatDecoder as b, resolveVariableShaderTypeAlias as c, RenderPipeline as d, Shader as f, getExternalImageSize as g, Sampler as h, getTypedArrayConstructor as i, flattenBindingsByGroup as l, Texture as m, getScratchArrayBuffer as n, getAttributeInfosFromLayouts as o, TextureView as p, alignTo as r, getVariableShaderTypeInfo as s, getScratchArray as t, normalizeBindingsByGroup as u, textureFormatDecoder as v, uid as w, dataTypeDecoder as x, getTextureFormatTable as y };

//# sourceMappingURL=array-utils-flat-Bju7gTeo.js.map