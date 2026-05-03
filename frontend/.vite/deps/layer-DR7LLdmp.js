import { E as ProbeLog, S as Buffer, i as getTypedArrayConstructor, m as Texture, x as dataTypeDecoder } from "./array-utils-flat-Bju7gTeo.js";
import { t as WebGLDevice } from "./webgl-device-DtCTgh9A.js";
import { C as getOffsetOrigin, J as lerp, L as transformMat4, P as fp64arithmetic, S as project_default, T as memoize, U as sub, X as defaultLogger, a as WebMercatorViewport, c as mergeBounds, d as typed_array_manager_default, h as addMetersToLngLat, n as deepEqual, r as Model, t as mergeShaders, u as toDoublePrecisionArray, x as worldToPixels } from "./shader-BokkZAiK.js";
//#region node_modules/@loaders.gl/loader-utils/dist/lib/env-utils/assert.js
/**
* Throws an `Error` with the optional `message` if `condition` is falsy
* @note Replacement for the external assert method to reduce bundle size
*/
function assert$2(condition, message) {
	if (!condition) throw new Error(message || "loader assertion failed.");
}
//#endregion
//#region node_modules/@loaders.gl/loader-utils/dist/lib/env-utils/globals.js
var globals$1 = {
	self: typeof self !== "undefined" && self,
	window: typeof window !== "undefined" && window,
	global: typeof global !== "undefined" && global,
	document: typeof document !== "undefined" && document
};
globals$1.self || globals$1.window || globals$1.global;
globals$1.window || globals$1.self || globals$1.global;
globals$1.global || globals$1.self || globals$1.window;
globals$1.document;
/** true if running in a browser */
var isBrowser$1 = Boolean(typeof process !== "object" || String(process) !== "[object process]" || process.browser);
var matches$1 = typeof process !== "undefined" && process.version && /v([0-9]*)/.exec(process.version);
matches$1 && parseFloat(matches$1[1]);
var version = "4.4.1"[0] >= "0" && "4.4.1"[0] <= "9" ? `v4.4.1` : "";
function createLog() {
	const log = new ProbeLog({ id: "loaders.gl" });
	globalThis.loaders ||= {};
	globalThis.loaders.log = log;
	globalThis.loaders.version = version;
	globalThis.probe ||= {};
	globalThis.probe.loaders = log;
	return log;
}
var log = createLog();
//#endregion
//#region node_modules/@loaders.gl/loader-utils/dist/lib/javascript-utils/is-type.js
/** Checks whether a value is a boolean */
var isBoolean = (value) => typeof value === "boolean";
/** Checks whether a value is a function */
var isFunction = (value) => typeof value === "function";
/** Checks whether a value is a non-null object */
var isObject$1 = (value) => value !== null && typeof value === "object";
/** Checks whether a value is a plain object (created by the Object constructor) */
var isPureObject = (value) => isObject$1(value) && value.constructor === {}.constructor;
/** Checks whether a value is an ArrayBuffer */
var isSharedArrayBuffer = (value) => typeof SharedArrayBuffer !== "undefined" && value instanceof SharedArrayBuffer;
/** Checks whether a value is ArrayBuffer-like */
var isArrayBufferLike = (value) => isObject$1(value) && typeof value.byteLength === "number" && typeof value.slice === "function";
/** Checks whether a value implements the iterable protocol */
var isIterable = (value) => Boolean(value) && isFunction(value[Symbol.iterator]);
/** Checks whether a value implements the async iterable protocol */
var isAsyncIterable$1 = (value) => Boolean(value) && isFunction(value[Symbol.asyncIterator]);
/** Checks whether a value is a fetch Response or a duck-typed equivalent */
var isResponse = (value) => typeof Response !== "undefined" && value instanceof Response || isObject$1(value) && isFunction(value.arrayBuffer) && isFunction(value.text) && isFunction(value.json);
/** Checks whether a value is a Blob */
var isBlob = (value) => typeof Blob !== "undefined" && value instanceof Blob;
/** Checks whether a value looks like a DOM ReadableStream */
var isReadableDOMStream = (value) => typeof ReadableStream !== "undefined" && value instanceof ReadableStream || isObject$1(value) && isFunction(value.tee) && isFunction(value.cancel) && isFunction(value.getReader);
/** Checks whether a value looks like a Node.js readable stream */
var isReadableNodeStream = (value) => isObject$1(value) && isFunction(value.read) && isFunction(value.pipe) && isBoolean(value.readable);
/** Checks whether a value is any readable stream (DOM or Node.js) */
var isReadableStream = (value) => isReadableDOMStream(value) || isReadableNodeStream(value);
//#endregion
//#region node_modules/@loaders.gl/loader-utils/dist/lib/option-utils/merge-options.js
/**
*
* @param baseOptions Can be undefined, in which case a fresh options object will be minted
* @param newOptions
* @returns
*/
function mergeOptions(baseOptions, newOptions) {
	return mergeOptionsRecursively(baseOptions || {}, newOptions);
}
function mergeOptionsRecursively(baseOptions, newOptions, level = 0) {
	if (level > 3) return newOptions;
	const options = { ...baseOptions };
	for (const [key, newValue] of Object.entries(newOptions)) if (newValue && typeof newValue === "object" && !Array.isArray(newValue)) options[key] = mergeOptionsRecursively(options[key] || {}, newOptions[key], level + 1);
	else options[key] = newOptions[key];
	return options;
}
//#endregion
//#region node_modules/@loaders.gl/worker-utils/dist/lib/npm-tag.js
/**
* NPM tag to use when loading modules from unpkg.com
* 'beta' on beta branch, 'latest' on prod branch
* @note Change between 'beta' and 'latest' depending on whether publishing alpha or prod releases
* @todo - unpkg.com doesn't seem to have a `latest` specifier for alpha releases...
*/
var NPM_TAG = "latest";
//#endregion
//#region node_modules/@loaders.gl/worker-utils/dist/lib/env-utils/version.js
function getVersion() {
	if (!globalThis._loadersgl_?.version) {
		globalThis._loadersgl_ = globalThis._loadersgl_ || {};
		globalThis._loadersgl_.version = "4.4.1";
	}
	return globalThis._loadersgl_.version;
}
var VERSION = getVersion();
//#endregion
//#region node_modules/@loaders.gl/worker-utils/dist/lib/env-utils/assert.js
/** Throws an `Error` with the optional `message` if `condition` is falsy */
function assert$1(condition, message) {
	if (!condition) throw new Error(message || "loaders.gl assertion failed.");
}
//#endregion
//#region node_modules/@loaders.gl/worker-utils/dist/lib/env-utils/globals.js
var globals = {
	self: typeof self !== "undefined" && self,
	window: typeof window !== "undefined" && window,
	global: typeof global !== "undefined" && global,
	document: typeof document !== "undefined" && document
};
globals.self || globals.window || globals.global;
globals.window || globals.self || globals.global;
globals.global || globals.self || globals.window;
globals.document;
/** true if running in the browser, false if running in Node.js */
var isBrowser = typeof process !== "object" || String(process) !== "[object process]" || process.browser;
/** true if running on a mobile device */
var isMobile = typeof window !== "undefined" && typeof window.orientation !== "undefined";
var matches = typeof process !== "undefined" && process.version && /v([0-9]*)/.exec(process.version);
matches && parseFloat(matches[1]);
//#endregion
//#region node_modules/@loaders.gl/worker-utils/dist/lib/worker-farm/worker-job.js
/**
* Represents one Job handled by a WorkerPool or WorkerFarm
*/
var WorkerJob = class {
	name;
	workerThread;
	isRunning = true;
	/** Promise that resolves when Job is done */
	result;
	_resolve = () => {};
	_reject = () => {};
	constructor(jobName, workerThread) {
		this.name = jobName;
		this.workerThread = workerThread;
		this.result = new Promise((resolve, reject) => {
			this._resolve = resolve;
			this._reject = reject;
		});
	}
	/**
	* Send a message to the job's worker thread
	* @param data any data structure, ideally consisting mostly of transferrable objects
	*/
	postMessage(type, payload) {
		this.workerThread.postMessage({
			source: "loaders.gl",
			type,
			payload
		});
	}
	/**
	* Call to resolve the `result` Promise with the supplied value
	*/
	done(value) {
		assert$1(this.isRunning);
		this.isRunning = false;
		this._resolve(value);
	}
	/**
	* Call to reject the `result` Promise with the supplied error
	*/
	error(error) {
		assert$1(this.isRunning);
		this.isRunning = false;
		this._reject(error);
	}
};
//#endregion
//#region node_modules/@loaders.gl/worker-utils/dist/lib/node/worker_threads-browser.js
/** Browser polyfill for Node.js built-in `worker_threads` module.
* These fills are non-functional, and just intended to ensure that
* `import 'worker_threads` doesn't break browser builds.
* The replacement is done in package.json browser field
*/
var NodeWorker = class {
	terminate() {}
};
//#endregion
//#region node_modules/@loaders.gl/worker-utils/dist/lib/worker-utils/get-loadable-worker-url.js
var workerURLCache = /* @__PURE__ */ new Map();
/**
* Creates a loadable URL from worker source or URL
* that can be used to create `Worker` instances.
* Due to CORS issues it may be necessary to wrap a URL in a small importScripts
* @param props
* @param props.source Worker source
* @param props.url Worker URL
* @returns loadable url
*/
function getLoadableWorkerURL(props) {
	assert$1(props.source && !props.url || !props.source && props.url);
	let workerURL = workerURLCache.get(props.source || props.url);
	if (!workerURL) {
		if (props.url) {
			workerURL = getLoadableWorkerURLFromURL(props.url);
			workerURLCache.set(props.url, workerURL);
		}
		if (props.source) {
			workerURL = getLoadableWorkerURLFromSource(props.source);
			workerURLCache.set(props.source, workerURL);
		}
	}
	assert$1(workerURL);
	return workerURL;
}
/**
* Build a loadable worker URL from worker URL
* @param url
* @returns loadable URL
*/
function getLoadableWorkerURLFromURL(url) {
	if (!url.startsWith("http")) return url;
	return getLoadableWorkerURLFromSource(buildScriptSource(url));
}
/**
* Build a loadable worker URL from worker source
* @param workerSource
* @returns loadable url
*/
function getLoadableWorkerURLFromSource(workerSource) {
	const blob = new Blob([workerSource], { type: "application/javascript" });
	return URL.createObjectURL(blob);
}
/**
* Per spec, worker cannot be initialized with a script from a different origin
* However a local worker script can still import scripts from other origins,
* so we simply build a wrapper script.
*
* @param workerUrl
* @returns source
*/
function buildScriptSource(workerUrl) {
	return `\
try {
  importScripts('${workerUrl}');
} catch (error) {
  console.error(error);
  throw error;
}`;
}
//#endregion
//#region node_modules/@loaders.gl/worker-utils/dist/lib/worker-utils/get-transfer-list.js
/**
* Returns an array of Transferrable objects that can be used with postMessage
* https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage
* @param object data to be sent via postMessage
* @param recursive - not for application use
* @param transfers - not for application use
* @returns a transfer list that can be passed to postMessage
*/
function getTransferList(object, recursive = true, transfers) {
	const transfersSet = transfers || /* @__PURE__ */ new Set();
	if (!object) {} else if (isTransferable(object)) transfersSet.add(object);
	else if (isTransferable(object.buffer)) transfersSet.add(object.buffer);
	else if (ArrayBuffer.isView(object)) {} else if (recursive && typeof object === "object") for (const key in object) getTransferList(object[key], recursive, transfersSet);
	return transfers === void 0 ? Array.from(transfersSet) : [];
}
function isTransferable(object) {
	if (!object) return false;
	if (object instanceof ArrayBuffer) return true;
	if (typeof MessagePort !== "undefined" && object instanceof MessagePort) return true;
	if (typeof ImageBitmap !== "undefined" && object instanceof ImageBitmap) return true;
	if (typeof OffscreenCanvas !== "undefined" && object instanceof OffscreenCanvas) return true;
	return false;
}
//#endregion
//#region node_modules/@loaders.gl/worker-utils/dist/lib/worker-farm/worker-thread.js
var NOOP = () => {};
/**
* Represents one worker thread
*/
var WorkerThread = class {
	name;
	source;
	url;
	terminated = false;
	worker;
	onMessage;
	onError;
	_loadableURL = "";
	/** Checks if workers are supported on this platform */
	static isSupported() {
		return typeof Worker !== "undefined" && isBrowser || typeof NodeWorker !== "undefined" && !isBrowser;
	}
	constructor(props) {
		const { name, source, url } = props;
		assert$1(source || url);
		this.name = name;
		this.source = source;
		this.url = url;
		this.onMessage = NOOP;
		this.onError = (error) => console.log(error);
		this.worker = isBrowser ? this._createBrowserWorker() : this._createNodeWorker();
	}
	/**
	* Terminate this worker thread
	* @note Can free up significant memory
	*/
	destroy() {
		this.onMessage = NOOP;
		this.onError = NOOP;
		this.worker.terminate();
		this.terminated = true;
	}
	get isRunning() {
		return Boolean(this.onMessage);
	}
	/**
	* Send a message to this worker thread
	* @param data any data structure, ideally consisting mostly of transferrable objects
	* @param transferList If not supplied, calculated automatically by traversing data
	*/
	postMessage(data, transferList) {
		transferList = transferList || getTransferList(data);
		this.worker.postMessage(data, transferList);
	}
	/**
	* Generate a standard Error from an ErrorEvent
	* @param event
	*/
	_getErrorFromErrorEvent(event) {
		let message = "Failed to load ";
		message += `worker ${this.name} from ${this.url}. `;
		if (event.message) message += `${event.message} in `;
		if (event.lineno) message += `:${event.lineno}:${event.colno}`;
		return new Error(message);
	}
	/**
	* Creates a worker thread on the browser
	*/
	_createBrowserWorker() {
		this._loadableURL = getLoadableWorkerURL({
			source: this.source,
			url: this.url
		});
		const worker = new Worker(this._loadableURL, { name: this.name });
		worker.onmessage = (event) => {
			if (!event.data) this.onError(/* @__PURE__ */ new Error("No data received"));
			else this.onMessage(event.data);
		};
		worker.onerror = (error) => {
			this.onError(this._getErrorFromErrorEvent(error));
			this.terminated = true;
		};
		worker.onmessageerror = (event) => console.error(event);
		return worker;
	}
	/**
	* Creates a worker thread in node.js
	* @todo https://nodejs.org/api/async_hooks.html#async-resource-worker-pool
	*/
	_createNodeWorker() {
		let worker;
		if (this.url) worker = new NodeWorker(this.url.includes(":/") || this.url.startsWith("/") ? this.url : `./${this.url}`, {
			eval: false,
			type: this.url.endsWith(".ts") || this.url.endsWith(".mjs") ? "module" : "commonjs"
		});
		else if (this.source) worker = new NodeWorker(this.source, { eval: true });
		else throw new Error("no worker");
		worker.on("message", (data) => {
			this.onMessage(data);
		});
		worker.on("error", (error) => {
			this.onError(error);
		});
		worker.on("exit", (code) => {});
		return worker;
	}
};
//#endregion
//#region node_modules/@loaders.gl/worker-utils/dist/lib/worker-farm/worker-pool.js
/**
* Process multiple data messages with small pool of identical workers
*/
var WorkerPool = class {
	name = "unnamed";
	source;
	url;
	maxConcurrency = 1;
	maxMobileConcurrency = 1;
	onDebug = () => {};
	reuseWorkers = true;
	props = {};
	jobQueue = [];
	idleQueue = [];
	count = 0;
	isDestroyed = false;
	/** Checks if workers are supported on this platform */
	static isSupported() {
		return WorkerThread.isSupported();
	}
	/**
	* @param processor - worker function
	* @param maxConcurrency - max count of workers
	*/
	constructor(props) {
		this.source = props.source;
		this.url = props.url;
		this.setProps(props);
	}
	/**
	* Terminates all workers in the pool
	* @note Can free up significant memory
	*/
	destroy() {
		this.idleQueue.forEach((worker) => worker.destroy());
		this.isDestroyed = true;
	}
	setProps(props) {
		this.props = {
			...this.props,
			...props
		};
		if (props.name !== void 0) this.name = props.name;
		if (props.maxConcurrency !== void 0) this.maxConcurrency = props.maxConcurrency;
		if (props.maxMobileConcurrency !== void 0) this.maxMobileConcurrency = props.maxMobileConcurrency;
		if (props.reuseWorkers !== void 0) this.reuseWorkers = props.reuseWorkers;
		if (props.onDebug !== void 0) this.onDebug = props.onDebug;
	}
	async startJob(name, onMessage = (job, type, data) => job.done(data), onError = (job, error) => job.error(error)) {
		const startPromise = new Promise((onStart) => {
			this.jobQueue.push({
				name,
				onMessage,
				onError,
				onStart
			});
			return this;
		});
		this._startQueuedJob();
		return await startPromise;
	}
	/**
	* Starts first queued job if worker is available or can be created
	* Called when job is started and whenever a worker returns to the idleQueue
	*/
	async _startQueuedJob() {
		if (!this.jobQueue.length) return;
		const workerThread = this._getAvailableWorker();
		if (!workerThread) return;
		const queuedJob = this.jobQueue.shift();
		if (queuedJob) {
			this.onDebug({
				message: "Starting job",
				name: queuedJob.name,
				workerThread,
				backlog: this.jobQueue.length
			});
			const job = new WorkerJob(queuedJob.name, workerThread);
			workerThread.onMessage = (data) => queuedJob.onMessage(job, data.type, data.payload);
			workerThread.onError = (error) => queuedJob.onError(job, error);
			queuedJob.onStart(job);
			try {
				await job.result;
			} catch (error) {
				console.error(`Worker exception: ${error}`);
			} finally {
				this.returnWorkerToQueue(workerThread);
			}
		}
	}
	/**
	* Returns a worker to the idle queue
	* Destroys the worker if
	*  - pool is destroyed
	*  - if this pool doesn't reuse workers
	*  - if maxConcurrency has been lowered
	* @param worker
	*/
	returnWorkerToQueue(worker) {
		if (!isBrowser || this.isDestroyed || !this.reuseWorkers || this.count > this._getMaxConcurrency()) {
			worker.destroy();
			this.count--;
		} else this.idleQueue.push(worker);
		if (!this.isDestroyed) this._startQueuedJob();
	}
	/**
	* Returns idle worker or creates new worker if maxConcurrency has not been reached
	*/
	_getAvailableWorker() {
		if (this.idleQueue.length > 0) return this.idleQueue.shift() || null;
		if (this.count < this._getMaxConcurrency()) {
			this.count++;
			return new WorkerThread({
				name: `${this.name.toLowerCase()} (#${this.count} of ${this.maxConcurrency})`,
				source: this.source,
				url: this.url
			});
		}
		return null;
	}
	_getMaxConcurrency() {
		return isMobile ? this.maxMobileConcurrency : this.maxConcurrency;
	}
};
//#endregion
//#region node_modules/@loaders.gl/worker-utils/dist/lib/worker-farm/worker-farm.js
var DEFAULT_PROPS = {
	maxConcurrency: 3,
	maxMobileConcurrency: 1,
	reuseWorkers: true,
	onDebug: () => {}
};
/**
* Process multiple jobs with a "farm" of different workers in worker pools.
*/
var WorkerFarm = class WorkerFarm {
	props;
	workerPools = /* @__PURE__ */ new Map();
	static _workerFarm;
	/** Checks if workers are supported on this platform */
	static isSupported() {
		return WorkerThread.isSupported();
	}
	/** Get the singleton instance of the global worker farm */
	static getWorkerFarm(props = {}) {
		WorkerFarm._workerFarm = WorkerFarm._workerFarm || new WorkerFarm({});
		WorkerFarm._workerFarm.setProps(props);
		return WorkerFarm._workerFarm;
	}
	/** get global instance with WorkerFarm.getWorkerFarm() */
	constructor(props) {
		this.props = { ...DEFAULT_PROPS };
		this.setProps(props);
		/** @type Map<string, WorkerPool>} */
		this.workerPools = /* @__PURE__ */ new Map();
	}
	/**
	* Terminate all workers in the farm
	* @note Can free up significant memory
	*/
	destroy() {
		for (const workerPool of this.workerPools.values()) workerPool.destroy();
		this.workerPools = /* @__PURE__ */ new Map();
	}
	/**
	* Set props used when initializing worker pools
	* @param props
	*/
	setProps(props) {
		this.props = {
			...this.props,
			...props
		};
		for (const workerPool of this.workerPools.values()) workerPool.setProps(this._getWorkerPoolProps());
	}
	/**
	* Returns a worker pool for the specified worker
	* @param options - only used first time for a specific worker name
	* @param options.name - the name of the worker - used to identify worker pool
	* @param options.url -
	* @param options.source -
	* @example
	*   const job = WorkerFarm.getWorkerFarm().getWorkerPool({name, url}).startJob(...);
	*/
	getWorkerPool(options) {
		const { name, source, url } = options;
		let workerPool = this.workerPools.get(name);
		if (!workerPool) {
			workerPool = new WorkerPool({
				name,
				source,
				url
			});
			workerPool.setProps(this._getWorkerPoolProps());
			this.workerPools.set(name, workerPool);
		}
		return workerPool;
	}
	_getWorkerPoolProps() {
		return {
			maxConcurrency: this.props.maxConcurrency,
			maxMobileConcurrency: this.props.maxMobileConcurrency,
			reuseWorkers: this.props.reuseWorkers,
			onDebug: this.props.onDebug
		};
	}
};
//#endregion
//#region node_modules/@loaders.gl/worker-utils/dist/lib/worker-api/get-worker-url.js
/**
* Generate a worker URL based on worker object and options
* @returns A URL to one of the following:
* - a published worker on unpkg CDN
* - a local test worker
* - a URL provided by the user in options
*/
function getWorkerURL(worker, options = {}) {
	const workerOptions = options[worker.id] || {};
	const workerFile = isBrowser ? `${worker.id}-worker.js` : `${worker.id}-worker-node.js`;
	let url = workerOptions.workerUrl;
	if (!url && worker.id === "compression") url = options.workerUrl;
	if ((options._workerType || options?.core?._workerType) === "test") if (isBrowser) url = `modules/${worker.module}/dist/${workerFile}`;
	else url = `modules/${worker.module}/src/workers/${worker.id}-worker-node.ts`;
	if (!url) {
		let version = worker.version;
		if (version === "latest") version = NPM_TAG;
		const versionTag = version ? `@${version}` : "";
		url = `https://unpkg.com/@loaders.gl/${worker.module}${versionTag}/dist/${workerFile}`;
	}
	assert$1(url);
	return url;
}
//#endregion
//#region node_modules/@loaders.gl/worker-utils/dist/lib/worker-api/validate-worker-version.js
/**
* Check if worker is compatible with this library version
* @param worker
* @param libVersion
* @returns `true` if the two versions are compatible
*/
function validateWorkerVersion(worker, coreVersion = VERSION) {
	assert$1(worker, "no worker provided");
	const workerVersion = worker.version;
	if (!coreVersion || !workerVersion) return false;
	return true;
}
//#endregion
//#region node_modules/@loaders.gl/loader-utils/dist/lib/worker-loader-utils/parse-with-worker.js
/**
* Determines if a loader can parse with worker
* @param loader
* @param options
*/
function canParseWithWorker(loader, options) {
	if (!WorkerFarm.isSupported()) return false;
	const nodeWorkers = options?._nodeWorkers ?? options?.core?._nodeWorkers;
	if (!isBrowser && !nodeWorkers) return false;
	const useWorkers = options?.worker ?? options?.core?.worker;
	return Boolean(loader.worker && useWorkers);
}
/**
* this function expects that the worker function sends certain messages,
* this can be automated if the worker is wrapper by a call to createLoaderWorker in @loaders.gl/loader-utils.
*/
async function parseWithWorker(loader, data, options, context, parseOnMainThread) {
	const name = loader.id;
	const url = getWorkerURL(loader, options);
	const workerPool = WorkerFarm.getWorkerFarm(options?.core).getWorkerPool({
		name,
		url
	});
	options = JSON.parse(JSON.stringify(options));
	context = JSON.parse(JSON.stringify(context || {}));
	const job = await workerPool.startJob("process-on-worker", onMessage.bind(null, parseOnMainThread));
	job.postMessage("process", {
		input: data,
		options,
		context
	});
	return await (await job.result).result;
}
/**
* Handle worker's responses to the main thread
* @param job
* @param type
* @param payload
*/
async function onMessage(parseOnMainThread, job, type, payload) {
	switch (type) {
		case "done":
			job.done(payload);
			break;
		case "error":
			job.error(new Error(payload.error));
			break;
		case "process":
			const { id, input, options } = payload;
			try {
				const result = await parseOnMainThread(input, options);
				job.postMessage("done", {
					id,
					result
				});
			} catch (error) {
				const message = error instanceof Error ? error.message : "unknown error";
				job.postMessage("error", {
					id,
					error: message
				});
			}
			break;
		default: console.warn(`parse-with-worker unknown message ${type}`);
	}
}
//#endregion
//#region node_modules/@loaders.gl/loader-utils/dist/lib/binary-utils/array-buffer-utils.js
/**
* compare two binary arrays for equality
* @param a
* @param b
* @param byteLength
*/
function compareArrayBuffers(arrayBuffer1, arrayBuffer2, byteLength) {
	byteLength = byteLength || arrayBuffer1.byteLength;
	if (arrayBuffer1.byteLength < byteLength || arrayBuffer2.byteLength < byteLength) return false;
	const array1 = new Uint8Array(arrayBuffer1);
	const array2 = new Uint8Array(arrayBuffer2);
	for (let i = 0; i < array1.length; ++i) if (array1[i] !== array2[i]) return false;
	return true;
}
/**
* Concatenate a sequence of ArrayBuffers from arguments
* @return A concatenated ArrayBuffer
*/
function concatenateArrayBuffers(...sources) {
	return concatenateArrayBuffersFromArray(sources);
}
/**
* Concatenate a sequence of ArrayBuffers from array
* @return A concatenated ArrayBuffer
*/
function concatenateArrayBuffersFromArray(sources) {
	const sourceArrays = sources.map((source2) => source2 instanceof ArrayBuffer ? new Uint8Array(source2) : source2);
	const byteLength = sourceArrays.reduce((length, typedArray) => length + typedArray.byteLength, 0);
	const result = new Uint8Array(byteLength);
	let offset = 0;
	for (const sourceArray of sourceArrays) {
		result.set(sourceArray, offset);
		offset += sourceArray.byteLength;
	}
	return result.buffer;
}
//#endregion
//#region node_modules/@loaders.gl/loader-utils/dist/lib/iterators/async-iteration.js
/**
* Concatenates all binary chunks yielded by an async or sync iterator.
* Supports `ArrayBuffer`, typed array views, and `ArrayBufferLike` sources (e.g. `SharedArrayBuffer`).
* This allows atomic parsers to operate on iterator inputs by materializing them into a single buffer.
*/
async function concatenateArrayBuffersAsync(asyncIterator) {
	const arrayBuffers = [];
	for await (const chunk of asyncIterator) arrayBuffers.push(copyToArrayBuffer$1(chunk));
	return concatenateArrayBuffers(...arrayBuffers);
}
function copyToArrayBuffer$1(chunk) {
	if (chunk instanceof ArrayBuffer) return chunk;
	if (ArrayBuffer.isView(chunk)) {
		const { buffer, byteOffset, byteLength } = chunk;
		return copyFromBuffer(buffer, byteOffset, byteLength);
	}
	return copyFromBuffer(chunk);
}
function copyFromBuffer(buffer, byteOffset = 0, byteLength = buffer.byteLength - byteOffset) {
	const view = new Uint8Array(buffer, byteOffset, byteLength);
	const copy = new Uint8Array(view.length);
	copy.set(view);
	return copy.buffer;
}
//#endregion
//#region node_modules/@loaders.gl/loader-utils/dist/lib/path-utils/file-aliases.js
var pathPrefix = "";
var fileAliases = {};
/**
* Resolves aliases and adds path-prefix to paths
*/
function resolvePath(filename) {
	for (const alias in fileAliases) if (filename.startsWith(alias)) {
		const replacement = fileAliases[alias];
		filename = filename.replace(alias, replacement);
	}
	if (!filename.startsWith("http://") && !filename.startsWith("https://")) filename = `${pathPrefix}${filename}`;
	return filename;
}
//#endregion
//#region node_modules/@loaders.gl/loader-utils/dist/lib/node/buffer.browser.js
/**
* Convert Buffer to ArrayBuffer
* Converts Node.js `Buffer` to `ArrayBuffer` (without triggering bundler to include Buffer polyfill on browser)
* @todo better data type
*/
function toArrayBuffer$1(buffer) {
	return buffer;
}
//#endregion
//#region node_modules/@loaders.gl/loader-utils/dist/lib/binary-utils/memory-conversion-utils.js
/**
* Check for Node.js `Buffer` (without triggering bundler to include Buffer polyfill on browser)
*/
function isBuffer(value) {
	return value && typeof value === "object" && value.isBuffer;
}
/**
* Convert an object to an array buffer. Handles SharedArrayBuffers.
*/
function toArrayBuffer(data) {
	if (isBuffer(data)) return toArrayBuffer$1(data);
	if (data instanceof ArrayBuffer) return data;
	if (isSharedArrayBuffer(data)) return copyToArrayBuffer(data);
	if (ArrayBuffer.isView(data)) {
		const buffer = data.buffer;
		if (data.byteOffset === 0 && data.byteLength === data.buffer.byteLength) return buffer;
		return buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
	}
	if (typeof data === "string") {
		const text = data;
		return new TextEncoder().encode(text).buffer;
	}
	if (data && typeof data === "object" && data._toArrayBuffer) return data._toArrayBuffer();
	throw new Error("toArrayBuffer");
}
/** Ensure that SharedArrayBuffers are copied into ArrayBuffers */
function ensureArrayBuffer(bufferSource) {
	if (bufferSource instanceof ArrayBuffer) return bufferSource;
	if (isSharedArrayBuffer(bufferSource)) return copyToArrayBuffer(bufferSource);
	const { buffer, byteOffset, byteLength } = bufferSource;
	if (buffer instanceof ArrayBuffer && byteOffset === 0 && byteLength === buffer.byteLength) return buffer;
	return copyToArrayBuffer(buffer, byteOffset, byteLength);
}
/** Copies an ArrayBuffer or a section of an ArrayBuffer to a new ArrayBuffer, handles SharedArrayBuffers */
function copyToArrayBuffer(buffer, byteOffset = 0, byteLength = buffer.byteLength - byteOffset) {
	const view = new Uint8Array(buffer, byteOffset, byteLength);
	const copy = new Uint8Array(view.length);
	copy.set(view);
	return copy.buffer;
}
/** Convert an object to an ArrayBufferView, handles SharedArrayBuffers */
function toArrayBufferView(data) {
	if (ArrayBuffer.isView(data)) return data;
	return new Uint8Array(data);
}
//#endregion
//#region node_modules/@loaders.gl/loader-utils/dist/lib/path-utils/path.js
/**
* Replacement for Node.js path.filename
* @param url
*/
function filename(url) {
	const slashIndex = url ? url.lastIndexOf("/") : -1;
	return slashIndex >= 0 ? url.substr(slashIndex + 1) : url;
}
/**
* Replacement for Node.js path.dirname
* @param url
*/
function dirname(url) {
	const slashIndex = url ? url.lastIndexOf("/") : -1;
	return slashIndex >= 0 ? url.substr(0, slashIndex) : "";
}
//#endregion
//#region node_modules/@loaders.gl/core/dist/lib/fetch/fetch-error.js
var FetchError = class extends Error {
	constructor(message, info) {
		super(message);
		this.reason = info.reason;
		this.url = info.url;
		this.response = info.response;
	}
	/** A best effort reason for why the fetch failed */
	reason;
	/** The URL that failed to load. Empty string if not available. */
	url;
	/** The Response object, if any. */
	response;
};
//#endregion
//#region node_modules/@loaders.gl/core/dist/lib/utils/mime-type-utils.js
var DATA_URL_PATTERN = /^data:([-\w.]+\/[-\w.+]+)(;|,)/;
var MIME_TYPE_PATTERN = /^([-\w.]+\/[-\w.+]+)/;
/**
* Compare two MIME types, case insensitively etc.
* @param mimeType1
* @param mimeType2
* @returns true if the MIME types are equivalent
* @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types#structure_of_a_mime_type
*/
function compareMIMETypes(mimeType1, mimeType2) {
	if (mimeType1.toLowerCase() === mimeType2.toLowerCase()) return true;
	return false;
}
/**
* Remove extra data like `charset` from MIME types
* @param mimeString
* @returns A clean MIME type, or an empty string
*
* @todo - handle more advanced MIMETYpes, multiple types
* @todo - extract charset etc
*/
function parseMIMEType(mimeString) {
	const matches = MIME_TYPE_PATTERN.exec(mimeString);
	if (matches) return matches[1];
	return mimeString;
}
/**
* Extract MIME type from data URL
*
* @param mimeString
* @returns A clean MIME type, or an empty string
*
* @todo - handle more advanced MIMETYpes, multiple types
* @todo - extract charset etc
*/
function parseMIMETypeFromURL(url) {
	const matches = DATA_URL_PATTERN.exec(url);
	if (matches) return matches[1];
	return "";
}
//#endregion
//#region node_modules/@loaders.gl/core/dist/lib/utils/url-utils.js
var QUERY_STRING_PATTERN = /\?.*/;
function extractQueryString(url) {
	const matches = url.match(QUERY_STRING_PATTERN);
	return matches && matches[0];
}
function stripQueryString(url) {
	return url.replace(QUERY_STRING_PATTERN, "");
}
function shortenUrlForDisplay(url) {
	if (url.length < 50) return url;
	const urlEnd = url.slice(url.length - 15);
	return `${url.substr(0, 32)}...${urlEnd}`;
}
//#endregion
//#region node_modules/@loaders.gl/core/dist/lib/utils/resource-utils.js
/**
* Returns the URL associated with this resource.
* The returned value may include a query string and need further processing.
* If it cannot determine url, the corresponding value will be an empty string
*
* @todo string parameters are assumed to be URLs
*/
function getResourceUrl(resource) {
	if (isResponse(resource)) return resource.url;
	if (isBlob(resource)) return ("name" in resource ? resource.name : "") || "";
	if (typeof resource === "string") return resource;
	return "";
}
/**
* Returns the URL associated with this resource.
* The returned value may include a query string and need further processing.
* If it cannot determine url, the corresponding value will be an empty string
*
* @todo string parameters are assumed to be URLs
*/
function getResourceMIMEType(resource) {
	if (isResponse(resource)) {
		const contentTypeHeader = resource.headers.get("content-type") || "";
		const noQueryUrl = stripQueryString(resource.url);
		return parseMIMEType(contentTypeHeader) || parseMIMETypeFromURL(noQueryUrl);
	}
	if (isBlob(resource)) return resource.type || "";
	if (typeof resource === "string") return parseMIMETypeFromURL(resource);
	return "";
}
/**
* Returns (approximate) content length for a resource if it can be determined.
* Returns -1 if content length cannot be determined.
* @param resource

* @note string parameters are NOT assumed to be URLs
*/
function getResourceContentLength(resource) {
	if (isResponse(resource)) return resource.headers["content-length"] || -1;
	if (isBlob(resource)) return resource.size;
	if (typeof resource === "string") return resource.length;
	if (resource instanceof ArrayBuffer) return resource.byteLength;
	if (ArrayBuffer.isView(resource)) return resource.byteLength;
	return -1;
}
//#endregion
//#region node_modules/@loaders.gl/core/dist/lib/utils/response-utils.js
/**
* Returns a Response object
* Adds content-length header when possible
*
* @param resource
*/
async function makeResponse(resource) {
	if (isResponse(resource)) return resource;
	const headers = {};
	const contentLength = getResourceContentLength(resource);
	if (contentLength >= 0) headers["content-length"] = String(contentLength);
	const url = getResourceUrl(resource);
	const type = getResourceMIMEType(resource);
	if (type) headers["content-type"] = type;
	const initialDataUrl = await getInitialDataUrl(resource);
	if (initialDataUrl) headers["x-first-bytes"] = initialDataUrl;
	if (typeof resource === "string") resource = new TextEncoder().encode(resource);
	const response = new Response(resource, { headers });
	Object.defineProperty(response, "url", { value: url });
	return response;
}
/**
* Checks response status (async) and throws a helpful error message if status is not OK.
* @param response
*/
async function checkResponse(response) {
	if (!response.ok) throw await getResponseError(response);
}
async function getResponseError(response) {
	const shortUrl = shortenUrlForDisplay(response.url);
	let message = `Failed to fetch resource (${response.status}) ${response.statusText}: ${shortUrl}`;
	message = message.length > 100 ? `${message.slice(0, 100)}...` : message;
	const info = {
		reason: response.statusText,
		url: response.url,
		response
	};
	try {
		const contentType = response.headers.get("Content-Type");
		info.reason = !response.bodyUsed && contentType?.includes("application/json") ? await response.json() : await response.text();
	} catch (error) {}
	return new FetchError(message, info);
}
async function getInitialDataUrl(resource) {
	const INITIAL_DATA_LENGTH = 5;
	if (typeof resource === "string") return `data:,${resource.slice(0, INITIAL_DATA_LENGTH)}`;
	if (resource instanceof Blob) {
		const blobSlice = resource.slice(0, 5);
		return await new Promise((resolve) => {
			const reader = new FileReader();
			reader.onload = (event) => resolve(event?.target?.result);
			reader.readAsDataURL(blobSlice);
		});
	}
	if (resource instanceof ArrayBuffer) return `data:base64,${arrayBufferToBase64(resource.slice(0, INITIAL_DATA_LENGTH))}`;
	return null;
}
function arrayBufferToBase64(buffer) {
	let binary = "";
	const bytes = new Uint8Array(buffer);
	for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
	return btoa(binary);
}
//#endregion
//#region node_modules/@loaders.gl/core/dist/lib/fetch/fetch-file.js
function isNodePath(url) {
	return !isRequestURL(url) && !isDataURL(url);
}
function isRequestURL(url) {
	return url.startsWith("http:") || url.startsWith("https:");
}
function isDataURL(url) {
	return url.startsWith("data:");
}
/**
* fetch API compatible function
* - Supports fetching from Node.js local file system paths
* - Respects pathPrefix and file aliases
*/
async function fetchFile(urlOrData, fetchOptions) {
	if (typeof urlOrData === "string") {
		const url = resolvePath(urlOrData);
		if (isNodePath(url)) {
			if (globalThis.loaders?.fetchNode) return globalThis.loaders?.fetchNode(url, fetchOptions);
		}
		return await fetch(url, fetchOptions);
	}
	return await makeResponse(urlOrData);
}
//#endregion
//#region node_modules/@loaders.gl/core/dist/lib/loader-utils/loggers.js
var probeLog = new ProbeLog({ id: "loaders.gl" });
var NullLog = class {
	log() {
		return () => {};
	}
	info() {
		return () => {};
	}
	warn() {
		return () => {};
	}
	error() {
		return () => {};
	}
};
var ConsoleLog = class {
	console;
	constructor() {
		this.console = console;
	}
	log(...args) {
		return this.console.log.bind(this.console, ...args);
	}
	info(...args) {
		return this.console.info.bind(this.console, ...args);
	}
	warn(...args) {
		return this.console.warn.bind(this.console, ...args);
	}
	error(...args) {
		return this.console.error.bind(this.console, ...args);
	}
};
//#endregion
//#region node_modules/@loaders.gl/core/dist/lib/loader-utils/option-defaults.js
var DEFAULT_LOADER_OPTIONS = { core: {
	baseUrl: void 0,
	fetch: null,
	mimeType: void 0,
	fallbackMimeType: void 0,
	ignoreRegisteredLoaders: void 0,
	nothrow: false,
	log: new ConsoleLog(),
	useLocalLibraries: false,
	CDN: "https://unpkg.com/@loaders.gl",
	worker: true,
	maxConcurrency: 3,
	maxMobileConcurrency: 1,
	reuseWorkers: isBrowser$1,
	_nodeWorkers: false,
	_workerType: "",
	limit: 0,
	_limitMB: 0,
	batchSize: "auto",
	batchDebounceMs: 0,
	metadata: false,
	transforms: []
} };
var REMOVED_LOADER_OPTIONS = {
	baseUri: "core.baseUrl",
	fetch: "core.fetch",
	mimeType: "core.mimeType",
	fallbackMimeType: "core.fallbackMimeType",
	ignoreRegisteredLoaders: "core.ignoreRegisteredLoaders",
	nothrow: "core.nothrow",
	log: "core.log",
	useLocalLibraries: "core.useLocalLibraries",
	CDN: "core.CDN",
	worker: "core.worker",
	maxConcurrency: "core.maxConcurrency",
	maxMobileConcurrency: "core.maxMobileConcurrency",
	reuseWorkers: "core.reuseWorkers",
	_nodeWorkers: "core.nodeWorkers",
	_workerType: "core._workerType",
	_worker: "core._workerType",
	limit: "core.limit",
	_limitMB: "core._limitMB",
	batchSize: "core.batchSize",
	batchDebounceMs: "core.batchDebounceMs",
	metadata: "core.metadata",
	transforms: "core.transforms",
	throws: "nothrow",
	dataType: "(no longer used)",
	uri: "core.baseUrl",
	method: "core.fetch.method",
	headers: "core.fetch.headers",
	body: "core.fetch.body",
	mode: "core.fetch.mode",
	credentials: "core.fetch.credentials",
	cache: "core.fetch.cache",
	redirect: "core.fetch.redirect",
	referrer: "core.fetch.referrer",
	referrerPolicy: "core.fetch.referrerPolicy",
	integrity: "core.fetch.integrity",
	keepalive: "core.fetch.keepalive",
	signal: "core.fetch.signal"
};
//#endregion
//#region node_modules/@loaders.gl/core/dist/lib/loader-utils/option-utils.js
var CORE_LOADER_OPTION_KEYS = [
	"baseUrl",
	"fetch",
	"mimeType",
	"fallbackMimeType",
	"ignoreRegisteredLoaders",
	"nothrow",
	"log",
	"useLocalLibraries",
	"CDN",
	"worker",
	"maxConcurrency",
	"maxMobileConcurrency",
	"reuseWorkers",
	"_nodeWorkers",
	"_workerType",
	"limit",
	"_limitMB",
	"batchSize",
	"batchDebounceMs",
	"metadata",
	"transforms"
];
/**
* Helper for safely accessing global loaders.gl variables
* Wraps initialization of global variable in function to defeat overly aggressive tree-shakers
*/
function getGlobalLoaderState() {
	globalThis.loaders = globalThis.loaders || {};
	const { loaders } = globalThis;
	if (!loaders._state) loaders._state = {};
	return loaders._state;
}
/**
* Store global loader options on the global object to increase chances of cross loaders-version interoperability
* NOTE: This use case is not reliable but can help when testing new versions of loaders.gl with existing frameworks
* @returns global loader options merged with default loader options
*/
function getGlobalLoaderOptions() {
	const state = getGlobalLoaderState();
	state.globalOptions = state.globalOptions || {
		...DEFAULT_LOADER_OPTIONS,
		core: { ...DEFAULT_LOADER_OPTIONS.core }
	};
	return normalizeLoaderOptions(state.globalOptions);
}
/**
* Merges options with global opts and loader defaults, also injects baseUrl
* @param options
* @param loader
* @param loaders
* @param url
*/
function normalizeOptions(options, loader, loaders, url) {
	loaders = loaders || [];
	loaders = Array.isArray(loaders) ? loaders : [loaders];
	validateOptions(options, loaders);
	return normalizeLoaderOptions(normalizeOptionsInternal(loader, options, url));
}
/**
* Returns a copy of the provided options with deprecated top-level core fields moved into `core`
* and removed from the top level. This keeps global options from leaking deprecated aliases into
* loader-specific option maps during normalization.
*/
function normalizeLoaderOptions(options) {
	const normalized = cloneLoaderOptions(options);
	moveDeprecatedTopLevelOptionsToCore(normalized);
	for (const key of CORE_LOADER_OPTION_KEYS) if (normalized.core && normalized.core[key] !== void 0) delete normalized[key];
	if (normalized.core && normalized.core._workerType !== void 0) delete normalized._worker;
	return normalized;
}
/**
* Warn for unsupported options
* @param options
* @param loaders
*/
function validateOptions(options, loaders) {
	validateOptionsObject(options, null, DEFAULT_LOADER_OPTIONS, REMOVED_LOADER_OPTIONS, loaders);
	for (const loader of loaders) {
		const idOptions = options && options[loader.id] || {};
		const loaderOptions = loader.options && loader.options[loader.id] || {};
		const deprecatedOptions = loader.deprecatedOptions && loader.deprecatedOptions[loader.id] || {};
		validateOptionsObject(idOptions, loader.id, loaderOptions, deprecatedOptions, loaders);
	}
}
function validateOptionsObject(options, id, defaultOptions, deprecatedOptions, loaders) {
	const loaderName = id || "Top level";
	const prefix = id ? `${id}.` : "";
	for (const key in options) {
		const isSubOptions = !id && isObject$1(options[key]);
		const isBaseUriOption = key === "baseUri" && !id;
		const isWorkerUrlOption = key === "workerUrl" && id;
		if (!(key in defaultOptions) && !isBaseUriOption && !isWorkerUrlOption) {
			if (key in deprecatedOptions) {
				if (probeLog.level > 0) probeLog.warn(`${loaderName} loader option \'${prefix}${key}\' no longer supported, use \'${deprecatedOptions[key]}\'`)();
			} else if (!isSubOptions) {
				if (probeLog.level > 0) {
					const suggestion = findSimilarOption(key, loaders);
					probeLog.warn(`${loaderName} loader option \'${prefix}${key}\' not recognized. ${suggestion}`)();
				}
			}
		}
	}
}
function findSimilarOption(optionKey, loaders) {
	const lowerCaseOptionKey = optionKey.toLowerCase();
	let bestSuggestion = "";
	for (const loader of loaders) for (const key in loader.options) {
		if (optionKey === key) return `Did you mean \'${loader.id}.${key}\'?`;
		const lowerCaseKey = key.toLowerCase();
		if (lowerCaseOptionKey.startsWith(lowerCaseKey) || lowerCaseKey.startsWith(lowerCaseOptionKey)) bestSuggestion = bestSuggestion || `Did you mean \'${loader.id}.${key}\'?`;
	}
	return bestSuggestion;
}
function normalizeOptionsInternal(loader, options, url) {
	const loaderDefaultOptions = loader.options || {};
	const mergedOptions = { ...loaderDefaultOptions };
	if (loaderDefaultOptions.core) mergedOptions.core = { ...loaderDefaultOptions.core };
	moveDeprecatedTopLevelOptionsToCore(mergedOptions);
	if (mergedOptions.core?.log === null) mergedOptions.core = {
		...mergedOptions.core,
		log: new NullLog()
	};
	mergeNestedFields(mergedOptions, normalizeLoaderOptions(getGlobalLoaderOptions()));
	mergeNestedFields(mergedOptions, normalizeLoaderOptions(options));
	addUrlOptions(mergedOptions, url);
	addDeprecatedTopLevelOptions(mergedOptions);
	return mergedOptions;
}
function mergeNestedFields(mergedOptions, options) {
	for (const key in options) if (key in options) {
		const value = options[key];
		if (isPureObject(value) && isPureObject(mergedOptions[key])) mergedOptions[key] = {
			...mergedOptions[key],
			...options[key]
		};
		else mergedOptions[key] = options[key];
	}
}
/**
* Harvest information from the url
* @deprecated This is mainly there to support loaders that still resolve from options
* TODO - extract extension?
* TODO - extract query parameters?
* TODO - should these be injected on context instead of options?
*/
function addUrlOptions(options, url) {
	if (!url) return;
	if (!(options.core?.baseUrl !== void 0)) {
		options.core ||= {};
		options.core.baseUrl = dirname(stripQueryString(url));
	}
}
function cloneLoaderOptions(options) {
	const clonedOptions = { ...options };
	if (options.core) clonedOptions.core = { ...options.core };
	return clonedOptions;
}
function moveDeprecatedTopLevelOptionsToCore(options) {
	if (options.baseUri !== void 0) {
		options.core ||= {};
		if (options.core.baseUrl === void 0) options.core.baseUrl = options.baseUri;
	}
	for (const key of CORE_LOADER_OPTION_KEYS) if (options[key] !== void 0) {
		const coreRecord = options.core = options.core || {};
		if (coreRecord[key] === void 0) coreRecord[key] = options[key];
	}
	const workerTypeAlias = options._worker;
	if (workerTypeAlias !== void 0) {
		options.core ||= {};
		if (options.core._workerType === void 0) options.core._workerType = workerTypeAlias;
	}
}
function addDeprecatedTopLevelOptions(options) {
	const coreOptions = options.core;
	if (!coreOptions) return;
	for (const key of CORE_LOADER_OPTION_KEYS) if (coreOptions[key] !== void 0) options[key] = coreOptions[key];
}
//#endregion
//#region node_modules/@loaders.gl/core/dist/lib/loader-utils/normalize-loader.js
function isLoaderObject(loader) {
	if (!loader) return false;
	if (Array.isArray(loader)) loader = loader[0];
	return Array.isArray(loader?.extensions);
}
function normalizeLoader(loader) {
	assert$2(loader, "null loader");
	assert$2(isLoaderObject(loader), "invalid loader");
	let options;
	if (Array.isArray(loader)) {
		options = loader[1];
		loader = loader[0];
		loader = {
			...loader,
			options: {
				...loader.options,
				...options
			}
		};
	}
	if (loader?.parseTextSync || loader?.parseText) loader.text = true;
	if (!loader.text) loader.binary = true;
	return loader;
}
//#endregion
//#region node_modules/@loaders.gl/core/dist/lib/api/register-loaders.js
/**
* Store global registered loaders on the global object to increase chances of cross loaders-version interoperability
* This use case is not reliable but can help when testing new versions of loaders.gl with existing frameworks
*/
var getGlobalLoaderRegistry = () => {
	const state = getGlobalLoaderState();
	state.loaderRegistry = state.loaderRegistry || [];
	return state.loaderRegistry;
};
/**
* Register a list of global loaders
* @note Registration erases loader type information.
* @deprecated It is recommended that applications manage loader registration. This function will likely be remove in loaders.gl v5
*/
function registerLoaders(loaders) {
	const loaderRegistry = getGlobalLoaderRegistry();
	loaders = Array.isArray(loaders) ? loaders : [loaders];
	for (const loader of loaders) {
		const normalizedLoader = normalizeLoader(loader);
		if (!loaderRegistry.find((registeredLoader) => normalizedLoader === registeredLoader)) loaderRegistry.unshift(normalizedLoader);
	}
}
/**
* @deprecated It is recommended that applications manage loader registration. This function will likely be remove in loaders.gl v5
*/
function getRegisteredLoaders() {
	return getGlobalLoaderRegistry();
}
//#endregion
//#region node_modules/@loaders.gl/core/dist/lib/api/select-loader.js
var EXT_PATTERN = /\.([^.]+)$/;
/**
* Find a loader that matches file extension and/or initial file content
* Search the loaders array argument for a loader that matches url extension or initial data
* Returns: a normalized loader
* @param data data to assist
* @param loaders
* @param options
* @param context used internally, applications should not provide this parameter
*/
async function selectLoader(data, loaders = [], options, context) {
	if (!validHTTPResponse(data)) return null;
	const normalizedOptions = normalizeLoaderOptions(options || {});
	normalizedOptions.core ||= {};
	if (data instanceof Response && mayContainText(data)) {
		const textLoader = selectLoaderSync(await data.clone().text(), loaders, {
			...normalizedOptions,
			core: {
				...normalizedOptions.core,
				nothrow: true
			}
		}, context);
		if (textLoader) return textLoader;
	}
	let loader = selectLoaderSync(data, loaders, {
		...normalizedOptions,
		core: {
			...normalizedOptions.core,
			nothrow: true
		}
	}, context);
	if (loader) return loader;
	if (isBlob(data)) {
		data = await data.slice(0, 10).arrayBuffer();
		loader = selectLoaderSync(data, loaders, normalizedOptions, context);
	}
	if (!loader && data instanceof Response && mayContainText(data)) loader = selectLoaderSync(await data.clone().text(), loaders, normalizedOptions, context);
	if (!loader && !normalizedOptions.core.nothrow) throw new Error(getNoValidLoaderMessage(data));
	return loader;
}
function mayContainText(response) {
	const mimeType = getResourceMIMEType(response);
	return Boolean(mimeType && (mimeType.startsWith("text/") || mimeType === "application/json" || mimeType.endsWith("+json")));
}
/**
* Find a loader that matches file extension and/or initial file content
* Search the loaders array argument for a loader that matches url extension or initial data
* Returns: a normalized loader
* @param data data to assist
* @param loaders
* @param options
* @param context used internally, applications should not provide this parameter
*/
function selectLoaderSync(data, loaders = [], options, context) {
	if (!validHTTPResponse(data)) return null;
	const normalizedOptions = normalizeLoaderOptions(options || {});
	normalizedOptions.core ||= {};
	if (loaders && !Array.isArray(loaders)) return normalizeLoader(loaders);
	let candidateLoaders = [];
	if (loaders) candidateLoaders = candidateLoaders.concat(loaders);
	if (!normalizedOptions.core.ignoreRegisteredLoaders) candidateLoaders.push(...getRegisteredLoaders());
	normalizeLoaders(candidateLoaders);
	const loader = selectLoaderInternal(data, candidateLoaders, normalizedOptions, context);
	if (!loader && !normalizedOptions.core.nothrow) throw new Error(getNoValidLoaderMessage(data));
	return loader;
}
/** Implements loaders selection logic */
function selectLoaderInternal(data, loaders, options, context) {
	const url = getResourceUrl(data);
	const type = getResourceMIMEType(data);
	const testUrl = stripQueryString(url) || context?.url;
	let loader = null;
	let reason = "";
	if (options?.core?.mimeType) {
		loader = findLoaderByMIMEType(loaders, options?.core?.mimeType);
		reason = `match forced by supplied MIME type ${options?.core?.mimeType}`;
	}
	loader = loader || findLoaderByUrl(loaders, testUrl);
	reason = reason || (loader ? `matched url ${testUrl}` : "");
	loader = loader || findLoaderByMIMEType(loaders, type);
	reason = reason || (loader ? `matched MIME type ${type}` : "");
	loader = loader || findLoaderByInitialBytes(loaders, data);
	reason = reason || (loader ? `matched initial data ${getFirstCharacters(data)}` : "");
	if (options?.core?.fallbackMimeType) {
		loader = loader || findLoaderByMIMEType(loaders, options?.core?.fallbackMimeType);
		reason = reason || (loader ? `matched fallback MIME type ${type}` : "");
	}
	if (reason) log.log(1, `selectLoader selected ${loader?.name}: ${reason}.`);
	return loader;
}
/** Check HTTP Response */
function validHTTPResponse(data) {
	if (data instanceof Response) {
		if (data.status === 204) return false;
	}
	return true;
}
/** Generate a helpful message to help explain why loader selection failed. */
function getNoValidLoaderMessage(data) {
	const url = getResourceUrl(data);
	const type = getResourceMIMEType(data);
	let message = "No valid loader found (";
	message += url ? `${filename(url)}, ` : "no url provided, ";
	message += `MIME type: ${type ? `"${type}"` : "not provided"}, `;
	const firstCharacters = data ? getFirstCharacters(data) : "";
	message += firstCharacters ? ` first bytes: "${firstCharacters}"` : "first bytes: not available";
	message += ")";
	return message;
}
function normalizeLoaders(loaders) {
	for (const loader of loaders) normalizeLoader(loader);
}
function findLoaderByUrl(loaders, url) {
	const match = url && EXT_PATTERN.exec(url);
	const extension = match && match[1];
	return extension ? findLoaderByExtension(loaders, extension) : null;
}
function findLoaderByExtension(loaders, extension) {
	extension = extension.toLowerCase();
	for (const loader of loaders) for (const loaderExtension of loader.extensions) if (loaderExtension.toLowerCase() === extension) return loader;
	return null;
}
function findLoaderByMIMEType(loaders, mimeType) {
	for (const loader of loaders) {
		if (loader.mimeTypes?.some((mimeType1) => compareMIMETypes(mimeType, mimeType1))) return loader;
		if (compareMIMETypes(mimeType, `application/x.${loader.id}`)) return loader;
	}
	return null;
}
function findLoaderByInitialBytes(loaders, data) {
	if (!data) return null;
	for (const loader of loaders) if (typeof data === "string") {
		if (testDataAgainstText(data, loader)) return loader;
	} else if (ArrayBuffer.isView(data)) {
		if (testDataAgainstBinary(data.buffer, data.byteOffset, loader)) return loader;
	} else if (data instanceof ArrayBuffer) {
		if (testDataAgainstBinary(data, 0, loader)) return loader;
	}
	return null;
}
function testDataAgainstText(data, loader) {
	if (loader.testText) return loader.testText(data);
	return (Array.isArray(loader.tests) ? loader.tests : [loader.tests]).some((test) => data.startsWith(test));
}
function testDataAgainstBinary(data, byteOffset, loader) {
	return (Array.isArray(loader.tests) ? loader.tests : [loader.tests]).some((test) => testBinary(data, byteOffset, loader, test));
}
function testBinary(data, byteOffset, loader, test) {
	if (isArrayBufferLike(test)) return compareArrayBuffers(test, data, test.byteLength);
	switch (typeof test) {
		case "function": return test(ensureArrayBuffer(data));
		case "string": return test === getMagicString(data, byteOffset, test.length);
		default: return false;
	}
}
function getFirstCharacters(data, length = 5) {
	if (typeof data === "string") return data.slice(0, length);
	else if (ArrayBuffer.isView(data)) return getMagicString(data.buffer, data.byteOffset, length);
	else if (data instanceof ArrayBuffer) return getMagicString(data, 0, length);
	return "";
}
function getMagicString(arrayBuffer, byteOffset, length) {
	if (arrayBuffer.byteLength < byteOffset + length) return "";
	const dataView = new DataView(arrayBuffer);
	let magic = "";
	for (let i = 0; i < length; i++) magic += String.fromCharCode(dataView.getUint8(byteOffset + i));
	return magic;
}
//#endregion
//#region node_modules/@loaders.gl/core/dist/iterators/make-iterator/make-string-iterator.js
var DEFAULT_CHUNK_SIZE$2 = 256 * 1024;
/**
* Returns an iterator that breaks a big string into chunks and yields them one-by-one as ArrayBuffers
* @param blob string to iterate over
* @param options
* @param options.chunkSize
*/
function* makeStringIterator(string, options) {
	const chunkSize = options?.chunkSize || DEFAULT_CHUNK_SIZE$2;
	let offset = 0;
	const textEncoder = new TextEncoder();
	while (offset < string.length) {
		const chunkLength = Math.min(string.length - offset, chunkSize);
		const chunk = string.slice(offset, offset + chunkLength);
		offset += chunkLength;
		yield ensureArrayBuffer(textEncoder.encode(chunk));
	}
}
//#endregion
//#region node_modules/@loaders.gl/core/dist/iterators/make-iterator/make-array-buffer-iterator.js
var DEFAULT_CHUNK_SIZE$1 = 256 * 1024;
/**
* Returns an iterator that breaks a big ArrayBuffer into chunks and yields them one-by-one
* @param blob ArrayBuffer to iterate over
* @param options
* @param options.chunkSize
*/
function* makeArrayBufferIterator(arrayBuffer, options = {}) {
	const { chunkSize = DEFAULT_CHUNK_SIZE$1 } = options;
	let byteOffset = 0;
	while (byteOffset < arrayBuffer.byteLength) {
		const chunkByteLength = Math.min(arrayBuffer.byteLength - byteOffset, chunkSize);
		const chunk = new ArrayBuffer(chunkByteLength);
		const sourceArray = new Uint8Array(arrayBuffer, byteOffset, chunkByteLength);
		new Uint8Array(chunk).set(sourceArray);
		byteOffset += chunkByteLength;
		yield chunk;
	}
}
//#endregion
//#region node_modules/@loaders.gl/core/dist/iterators/make-iterator/make-blob-iterator.js
var DEFAULT_CHUNK_SIZE = 1024 * 1024;
/**
* Returns an iterator that breaks a big Blob into chunks and yields them one-by-one
* @param blob Blob or File object
* @param options
* @param options.chunkSize
*/
async function* makeBlobIterator(blob, options) {
	const chunkSize = options?.chunkSize || DEFAULT_CHUNK_SIZE;
	let offset = 0;
	while (offset < blob.size) {
		const end = offset + chunkSize;
		const chunk = await blob.slice(offset, end).arrayBuffer();
		offset = end;
		yield chunk;
	}
}
//#endregion
//#region node_modules/@loaders.gl/core/dist/iterators/make-iterator/make-stream-iterator.js
/**
* Returns an async iterable that reads from a stream (works in both Node.js and browsers)
* @param stream stream to iterator over
*/
function makeStreamIterator(stream, options) {
	return isBrowser$1 ? makeBrowserStreamIterator(stream, options) : makeNodeStreamIterator(stream, options);
}
/**
* Returns an async iterable that reads from a DOM (browser) stream
* @param stream stream to iterate from
* @see https://jakearchibald.com/2017/async-iterators-and-generators/#making-streams-iterate
*/
async function* makeBrowserStreamIterator(stream, options) {
	const reader = stream.getReader();
	let nextBatchPromise;
	try {
		while (true) {
			const currentBatchPromise = nextBatchPromise || reader.read();
			if (options?._streamReadAhead) nextBatchPromise = reader.read();
			const { done, value } = await currentBatchPromise;
			if (done) return;
			yield toArrayBuffer(value);
		}
	} catch (error) {
		reader.releaseLock();
	}
}
/**
* Returns an async iterable that reads from a DOM (browser) stream
* @param stream stream to iterate from
* @note Requires Node.js >= 10
*/
async function* makeNodeStreamIterator(stream, options) {
	for await (const chunk of stream) yield toArrayBuffer(chunk);
}
//#endregion
//#region node_modules/@loaders.gl/core/dist/iterators/make-iterator/make-iterator.js
/**
* Returns an iterator that breaks its input into chunks and yields them one-by-one.
* @param data
* @param options
* @returns
* This function can e.g. be used to enable data sources that can only be read atomically
* (such as `Blob` and `File` via `FileReader`) to still be parsed in batches.
*/
function makeIterator(data, options) {
	if (typeof data === "string") return makeStringIterator(data, options);
	if (data instanceof ArrayBuffer) return makeArrayBufferIterator(data, options);
	if (isBlob(data)) return makeBlobIterator(data, options);
	if (isReadableStream(data)) return makeStreamIterator(data, options);
	if (isResponse(data)) {
		const responseBody = data.body;
		if (!responseBody) throw new Error("Readable stream not available on Response");
		return makeStreamIterator(responseBody, options);
	}
	throw new Error("makeIterator");
}
//#endregion
//#region node_modules/@loaders.gl/core/dist/lib/loader-utils/get-data.js
var ERR_DATA = "Cannot convert supplied data type";
/**
* Returns an {@link ArrayBuffer} or string from the provided data synchronously.
* Supports `ArrayBuffer`, `ArrayBufferView`, and `ArrayBufferLike` (e.g. `SharedArrayBuffer`)
* while preserving typed array view offsets.
*/
function getArrayBufferOrStringFromDataSync(data, loader, options) {
	if (loader.text && typeof data === "string") return data;
	if (isBuffer(data)) data = data.buffer;
	if (isArrayBufferLike(data)) {
		const bufferSource = toArrayBufferView(data);
		if (loader.text && !loader.binary) return new TextDecoder("utf8").decode(bufferSource);
		return toArrayBuffer(bufferSource);
	}
	throw new Error(ERR_DATA);
}
/**
* Resolves the provided data into an {@link ArrayBuffer} or string asynchronously.
* Accepts the full {@link DataType} surface including responses and async iterables.
*/
async function getArrayBufferOrStringFromData(data, loader, options) {
	if (typeof data === "string" || isArrayBufferLike(data)) return getArrayBufferOrStringFromDataSync(data, loader, options);
	if (isBlob(data)) data = await makeResponse(data);
	if (isResponse(data)) {
		await checkResponse(data);
		return loader.binary ? await data.arrayBuffer() : await data.text();
	}
	if (isReadableStream(data)) data = makeIterator(data, options);
	if (isIterable(data) || isAsyncIterable$1(data)) return concatenateArrayBuffersAsync(data);
	throw new Error(ERR_DATA);
}
//#endregion
//#region node_modules/@loaders.gl/core/dist/lib/loader-utils/get-fetch-function.js
/**
* Gets the current fetch function from options and context
* @param options
* @param context
*/
function getFetchFunction(options, context) {
	const globalOptions = getGlobalLoaderOptions();
	const loaderOptions = options || globalOptions;
	const fetchOption = loaderOptions.fetch ?? loaderOptions.core?.fetch;
	if (typeof fetchOption === "function") return fetchOption;
	if (isObject$1(fetchOption)) return (url) => fetchFile(url, fetchOption);
	if (context?.fetch) return context?.fetch;
	return fetchFile;
}
//#endregion
//#region node_modules/@loaders.gl/core/dist/lib/loader-utils/loader-context.js
/**
* "sub" loaders invoked by other loaders get a "context" injected on `this`
* The context will inject core methods like `parse` and contain information
* about loaders and options passed in to the top-level `parse` call.
*
* @param context
* @param options
* @param previousContext
*/
function getLoaderContext(context, options, parentContext) {
	if (parentContext) return parentContext;
	const newContext = {
		fetch: getFetchFunction(options, context),
		...context
	};
	if (newContext.url) {
		const baseUrl = stripQueryString(newContext.url);
		newContext.baseUrl = baseUrl;
		newContext.queryString = extractQueryString(newContext.url);
		newContext.filename = filename(baseUrl);
		newContext.baseUrl = dirname(baseUrl);
	}
	if (!Array.isArray(newContext.loaders)) newContext.loaders = null;
	return newContext;
}
function getLoadersFromContext(loaders, context) {
	if (loaders && !Array.isArray(loaders)) return loaders;
	let candidateLoaders;
	if (loaders) candidateLoaders = Array.isArray(loaders) ? loaders : [loaders];
	if (context && context.loaders) {
		const contextLoaders = Array.isArray(context.loaders) ? context.loaders : [context.loaders];
		candidateLoaders = candidateLoaders ? [...candidateLoaders, ...contextLoaders] : contextLoaders;
	}
	return candidateLoaders && candidateLoaders.length ? candidateLoaders : void 0;
}
//#endregion
//#region node_modules/@loaders.gl/core/dist/lib/api/parse.js
/**
* Parses `data` using a specified loader
* @param data
* @param loaders
* @param options
* @param context
*/
async function parse(data, loaders, options, context) {
	if (loaders && !Array.isArray(loaders) && !isLoaderObject(loaders)) {
		context = void 0;
		options = loaders;
		loaders = void 0;
	}
	data = await data;
	options = options || {};
	const url = getResourceUrl(data);
	const candidateLoaders = getLoadersFromContext(loaders, context);
	const loader = await selectLoader(data, candidateLoaders, options);
	if (!loader) return null;
	const strictOptions = normalizeOptions(options, loader, candidateLoaders, url);
	context = getLoaderContext({
		url,
		_parse: parse,
		loaders: candidateLoaders
	}, strictOptions, context || null);
	return await parseWithLoader(loader, data, strictOptions, context);
}
async function parseWithLoader(loader, data, options, context) {
	validateWorkerVersion(loader);
	options = mergeOptions(loader.options, options);
	if (isResponse(data)) {
		const { ok, redirected, status, statusText, type, url } = data;
		context.response = {
			headers: Object.fromEntries(data.headers.entries()),
			ok,
			redirected,
			status,
			statusText,
			type,
			url
		};
	}
	data = await getArrayBufferOrStringFromData(data, loader, options);
	const loaderWithParser = loader;
	if (loaderWithParser.parseTextSync && typeof data === "string") return loaderWithParser.parseTextSync(data, options, context);
	if (canParseWithWorker(loader, options)) return await parseWithWorker(loader, data, options, context, parse);
	if (loaderWithParser.parseText && typeof data === "string") return await loaderWithParser.parseText(data, options, context);
	if (loaderWithParser.parse) return await loaderWithParser.parse(data, options, context);
	assert$1(!loaderWithParser.parseSync);
	throw new Error(`${loader.id} loader - no parser found and worker is disabled`);
}
//#endregion
//#region node_modules/@loaders.gl/core/dist/lib/api/load.js
async function load(url, loaders, options, context) {
	let resolvedLoaders;
	let resolvedOptions;
	if (!Array.isArray(loaders) && !isLoaderObject(loaders)) {
		resolvedLoaders = [];
		resolvedOptions = loaders;
		context = void 0;
	} else {
		resolvedLoaders = loaders;
		resolvedOptions = options;
	}
	const fetch = getFetchFunction(resolvedOptions);
	let data = url;
	if (typeof url === "string") data = await fetch(url);
	if (isBlob(url)) data = await fetch(url);
	if (typeof url === "string") {
		if (!normalizeLoaderOptions(resolvedOptions || {}).core?.baseUrl) resolvedOptions = {
			...resolvedOptions,
			core: {
				...resolvedOptions?.core,
				baseUrl: url
			}
		};
	}
	return Array.isArray(resolvedLoaders) ? await parse(data, resolvedLoaders, resolvedOptions) : await parse(data, resolvedLoaders, resolvedOptions);
}
//#endregion
//#region node_modules/@deck.gl/core/dist/debug/loggers.js
var logState = {
	attributeUpdateStart: -1,
	attributeManagerUpdateStart: -1,
	attributeUpdateMessages: []
};
var LOG_LEVEL_MAJOR_UPDATE = 1;
var LOG_LEVEL_MINOR_UPDATE = 2;
var LOG_LEVEL_UPDATE_DETAIL = 3;
var LOG_LEVEL_INFO = 4;
var LOG_LEVEL_DRAW = 2;
var getLoggers = (log) => ({
	"layer.changeFlag": (layer, key, flags) => {
		log.log(LOG_LEVEL_UPDATE_DETAIL, `${layer.id} ${key}: `, flags[key])();
	},
	"layer.initialize": (layer) => {
		log.log(LOG_LEVEL_MAJOR_UPDATE, `Initializing ${layer}`)();
	},
	"layer.update": (layer, needsUpdate) => {
		if (needsUpdate) {
			const flags = layer.getChangeFlags();
			log.log(LOG_LEVEL_MINOR_UPDATE, `Updating ${layer} because: ${Object.keys(flags).filter((key) => flags[key]).join(", ")}`)();
		} else log.log(LOG_LEVEL_INFO, `${layer} does not need update`)();
	},
	"layer.matched": (layer, changed) => {
		if (changed) log.log(LOG_LEVEL_INFO, `Matched ${layer}, state transfered`)();
	},
	"layer.finalize": (layer) => {
		log.log(LOG_LEVEL_MAJOR_UPDATE, `Finalizing ${layer}`)();
	},
	"compositeLayer.renderLayers": (layer, updated, subLayers) => {
		if (updated) log.log(LOG_LEVEL_MINOR_UPDATE, `Composite layer rendered new subLayers ${layer}`, subLayers)();
		else log.log(LOG_LEVEL_INFO, `Composite layer reused subLayers ${layer}`, subLayers)();
	},
	"layerManager.setLayers": (layerManager, updated, layers) => {
		if (updated) log.log(LOG_LEVEL_MINOR_UPDATE, `Updating ${layers.length} deck layers`)();
	},
	"layerManager.activateViewport": (layerManager, viewport) => {
		log.log(LOG_LEVEL_UPDATE_DETAIL, "Viewport changed", viewport)();
	},
	"attributeManager.invalidate": (attributeManager, trigger, attributeNames) => {
		log.log(LOG_LEVEL_MAJOR_UPDATE, attributeNames ? `invalidated attributes ${attributeNames} (${trigger}) for ${attributeManager.id}` : `invalidated all attributes for ${attributeManager.id}`)();
	},
	"attributeManager.updateStart": (attributeManager) => {
		logState.attributeUpdateMessages.length = 0;
		logState.attributeManagerUpdateStart = Date.now();
	},
	"attributeManager.updateEnd": (attributeManager, numInstances) => {
		const timeMs = Math.round(Date.now() - logState.attributeManagerUpdateStart);
		log.groupCollapsed(LOG_LEVEL_MINOR_UPDATE, `Updated attributes for ${numInstances} instances in ${attributeManager.id} in ${timeMs}ms`)();
		for (const updateMessage of logState.attributeUpdateMessages) log.log(LOG_LEVEL_UPDATE_DETAIL, updateMessage)();
		log.groupEnd(LOG_LEVEL_MINOR_UPDATE)();
	},
	"attribute.updateStart": (attribute) => {
		logState.attributeUpdateStart = Date.now();
	},
	"attribute.allocate": (attribute, numInstances) => {
		const message = `${attribute.id} allocated ${numInstances}`;
		logState.attributeUpdateMessages.push(message);
	},
	"attribute.updateEnd": (attribute, numInstances) => {
		const timeMs = Math.round(Date.now() - logState.attributeUpdateStart);
		const message = `${attribute.id} updated ${numInstances} in ${timeMs}ms`;
		logState.attributeUpdateMessages.push(message);
	},
	"deckRenderer.renderLayers": (deckRenderer, renderStats, opts) => {
		const { pass, redrawReason } = opts;
		for (const status of renderStats) {
			const { totalCount, visibleCount, compositeCount, pickableCount } = status;
			const hiddenCount = totalCount - compositeCount - visibleCount;
			log.log(LOG_LEVEL_DRAW, `RENDER #${deckRenderer.renderCount} \
  ${visibleCount} (of ${totalCount} layers) to ${pass} because ${redrawReason} \
  (${hiddenCount} hidden, ${compositeCount} composite ${pickableCount} pickable)`)();
		}
	}
});
//#endregion
//#region node_modules/@deck.gl/core/dist/debug/index.js
var loggers = {};
loggers = getLoggers(defaultLogger);
function register(handlers) {
	loggers = handlers;
}
function debug(eventType, arg1, arg2, arg3) {
	if (defaultLogger.level > 0 && loggers[eventType]) loggers[eventType].call(null, arg1, arg2, arg3);
}
//#endregion
//#region node_modules/@luma.gl/shadertools/dist/lib/glsl-utils/shader-utils.js
var FS300 = `#version 300 es\nout vec4 transform_output;
void main() {
  transform_output = vec4(0);
}`;
/**
* Given the shader input and output variable names,
* builds and return a pass through fragment shader.
*/
function getPassthroughFS(options) {
	const { input, inputChannels, output } = options || {};
	if (!input) return FS300;
	if (!inputChannels) throw new Error("inputChannels");
	return `\
#version 300 es
in ${channelCountToType(inputChannels)} ${input};
out vec4 ${output};
void main() {
  ${output} = ${convertToVec4(input, inputChannels)};
}`;
}
function channelCountToType(channels) {
	switch (channels) {
		case 1: return "float";
		case 2: return "vec2";
		case 3: return "vec3";
		case 4: return "vec4";
		default: throw new Error(`invalid channels: ${channels}`);
	}
}
/** Returns glsl instruction for converting to vec4 */
function convertToVec4(variable, channels) {
	switch (channels) {
		case 1: return `vec4(${variable}, 0.0, 0.0, 1.0)`;
		case 2: return `vec4(${variable}, 0.0, 1.0)`;
		case 3: return `vec4(${variable}, 1.0)`;
		case 4: return variable;
		default: throw new Error(`invalid channels: ${channels}`);
	}
}
//#endregion
//#region node_modules/@luma.gl/shadertools/dist/lib/color/normalize-byte-colors.js
/**
* Resolves whether semantic colors should be interpreted as byte-style `0..255` values.
* @param useByteColors - Explicit color interpretation flag.
* @param defaultUseByteColors - Fallback value when `useByteColors` is omitted.
* @returns `true` when semantic colors should be normalized from bytes, otherwise `false`.
*/
function resolveUseByteColors(useByteColors, defaultUseByteColors = true) {
	return useByteColors ?? defaultUseByteColors;
}
/**
* Normalizes an RGB semantic color to float space when byte-style colors are enabled.
* @param color - Input RGB semantic color.
* @param useByteColors - When `true`, divide components by `255`.
* @returns The normalized RGB color.
*/
function normalizeByteColor3(color = [
	0,
	0,
	0
], useByteColors = true) {
	if (!useByteColors) return [...color];
	return color.map((component) => component / 255);
}
/**
* Normalizes an RGBA semantic color to float space when byte-style colors are enabled.
* @param color - Input RGB or RGBA semantic color.
* @param useByteColors - When `true`, divide components by `255`.
* @returns The normalized RGBA color, adding an opaque alpha channel when needed.
*/
function normalizeByteColor4(color, useByteColors = true) {
	const normalizedColor = normalizeByteColor3(color.slice(0, 3), useByteColors);
	const hasAlpha = Number.isFinite(color[3]);
	const alpha = hasAlpha ? color[3] : 1;
	return [
		normalizedColor[0],
		normalizedColor[1],
		normalizedColor[2],
		useByteColors && hasAlpha ? alpha / 255 : alpha
	];
}
/**
* Deprecated legacy picking module retained for compatibility with existing
* shadertools users such as deck.gl. Keep the shader contract stable.
*
* Provides support for color-coding-based picking and highlighting.
* In particular, supports picking a specific instance in an instanced
* draw call and highlighting an instance based on its picking color,
* and correspondingly, supports picking and highlighting groups of
* primitives with the same picking color in non-instanced draw-calls
*/
var picking = {
	props: {},
	uniforms: {},
	name: "picking",
	uniformTypes: {
		isActive: "f32",
		isAttribute: "f32",
		isHighlightActive: "f32",
		useByteColors: "f32",
		highlightedObjectColor: "vec3<f32>",
		highlightColor: "vec4<f32>"
	},
	defaultUniforms: {
		isActive: false,
		isAttribute: false,
		isHighlightActive: false,
		useByteColors: true,
		highlightedObjectColor: [
			0,
			0,
			0
		],
		highlightColor: [
			0,
			1,
			1,
			1
		]
	},
	vs: `\
layout(std140) uniform pickingUniforms {
  float isActive;
  float isAttribute;
  float isHighlightActive;
  float useByteColors;
  vec3 highlightedObjectColor;
  vec4 highlightColor;
} picking;

out vec4 picking_vRGBcolor_Avalid;

// Normalize unsigned byte color to 0-1 range
vec3 picking_normalizeColor(vec3 color) {
  return picking.useByteColors > 0.5 ? color / 255.0 : color;
}

// Normalize unsigned byte color to 0-1 range
vec4 picking_normalizeColor(vec4 color) {
  return picking.useByteColors > 0.5 ? color / 255.0 : color;
}

bool picking_isColorZero(vec3 color) {
  return dot(color, vec3(1.0)) < 0.00001;
}

bool picking_isColorValid(vec3 color) {
  return dot(color, vec3(1.0)) > 0.00001;
}

// Check if this vertex is highlighted 
bool isVertexHighlighted(vec3 vertexColor) {
  vec3 highlightedObjectColor = picking_normalizeColor(picking.highlightedObjectColor);
  return
    bool(picking.isHighlightActive) && picking_isColorZero(abs(vertexColor - highlightedObjectColor));
}

// Set the current picking color
void picking_setPickingColor(vec3 pickingColor) {
  pickingColor = picking_normalizeColor(pickingColor);

  if (bool(picking.isActive)) {
    // Use alpha as the validity flag. If pickingColor is [0, 0, 0] fragment is non-pickable
    picking_vRGBcolor_Avalid.a = float(picking_isColorValid(pickingColor));

    if (!bool(picking.isAttribute)) {
      // Stores the picking color so that the fragment shader can render it during picking
      picking_vRGBcolor_Avalid.rgb = pickingColor;
    }
  } else {
    // Do the comparison with selected item color in vertex shader as it should mean fewer compares
    picking_vRGBcolor_Avalid.a = float(isVertexHighlighted(pickingColor));
  }
}

void picking_setPickingAttribute(float value) {
  if (bool(picking.isAttribute)) {
    picking_vRGBcolor_Avalid.r = value;
  }
}

void picking_setPickingAttribute(vec2 value) {
  if (bool(picking.isAttribute)) {
    picking_vRGBcolor_Avalid.rg = value;
  }
}

void picking_setPickingAttribute(vec3 value) {
  if (bool(picking.isAttribute)) {
    picking_vRGBcolor_Avalid.rgb = value;
  }
}
`,
	fs: `\
layout(std140) uniform pickingUniforms {
  float isActive;
  float isAttribute;
  float isHighlightActive;
  float useByteColors;
  vec3 highlightedObjectColor;
  vec4 highlightColor;
} picking;

in vec4 picking_vRGBcolor_Avalid;

/*
 * Returns highlight color if this item is selected.
 */
vec4 picking_filterHighlightColor(vec4 color) {
  // If we are still picking, we don't highlight
  if (picking.isActive > 0.5) {
    return color;
  }

  bool selected = bool(picking_vRGBcolor_Avalid.a);

  if (selected) {
    // Blend in highlight color based on its alpha value
    float highLightAlpha = picking.highlightColor.a;
    float blendedAlpha = highLightAlpha + color.a * (1.0 - highLightAlpha);
    float highLightRatio = highLightAlpha / blendedAlpha;

    vec3 blendedRGB = mix(color.rgb, picking.highlightColor.rgb, highLightRatio);
    return vec4(blendedRGB, blendedAlpha);
  } else {
    return color;
  }
}

/*
 * Returns picking color if picking enabled else unmodified argument.
 */
vec4 picking_filterPickingColor(vec4 color) {
  if (bool(picking.isActive)) {
    if (picking_vRGBcolor_Avalid.a == 0.0) {
      discard;
    }
    return picking_vRGBcolor_Avalid;
  }
  return color;
}

/*
 * Returns picking color if picking is enabled if not
 * highlight color if this item is selected, otherwise unmodified argument.
 */
vec4 picking_filterColor(vec4 color) {
  vec4 highlightColor = picking_filterHighlightColor(color);
  return picking_filterPickingColor(highlightColor);
}
`,
	getUniforms
};
function getUniforms(opts = {}, prevUniforms) {
	const uniforms = {};
	const useByteColors = resolveUseByteColors(opts.useByteColors, true);
	if (opts.highlightedObjectColor === void 0) {} else if (opts.highlightedObjectColor === null) uniforms.isHighlightActive = false;
	else {
		uniforms.isHighlightActive = true;
		uniforms.highlightedObjectColor = opts.highlightedObjectColor.slice(0, 3);
	}
	if (opts.highlightColor) uniforms.highlightColor = normalizeByteColor4(opts.highlightColor, useByteColors);
	if (opts.isActive !== void 0) {
		uniforms.isActive = Boolean(opts.isActive);
		uniforms.isAttribute = Boolean(opts.isAttribute);
	}
	if (opts.useByteColors !== void 0) uniforms.useByteColors = Boolean(opts.useByteColors);
	return uniforms;
}
var color_default = {
	name: "color",
	dependencies: [],
	source: `

@must_use
fn deckgl_premultiplied_alpha(fragColor: vec4<f32>) -> vec4<f32> {
    return vec4(fragColor.rgb * fragColor.a, fragColor.a); 
};
`,
	getUniforms: (_props) => {
		return {};
	}
};
var project32_default = {
	name: "project32",
	dependencies: [project_default],
	source: `\
// Define a structure to hold both the clip-space position and the common position.
struct ProjectResult {
  clipPosition: vec4<f32>,
  commonPosition: vec4<f32>,
};

// This function mimics the GLSL version with the 'out' parameter by returning both values.
fn project_position_to_clipspace_and_commonspace(
    position: vec3<f32>,
    position64Low: vec3<f32>,
    offset: vec3<f32>
) -> ProjectResult {
  // Compute the projected position.
  let projectedPosition: vec3<f32> = project_position_vec3_f64(position, position64Low);

  // Start with the provided offset.
  var finalOffset: vec3<f32> = offset;

  // Get whether a rotation is needed and the rotation matrix.
  let rotationResult = project_needs_rotation(projectedPosition);

  // If rotation is needed, update the offset.
  if (rotationResult.needsRotation) {
    finalOffset = rotationResult.transform * offset;
  }

  // Compute the common position.
  let commonPosition: vec4<f32> = vec4<f32>(projectedPosition + finalOffset, 1.0);

  // Convert to clip-space.
  let clipPosition: vec4<f32> = project_common_position_to_clipspace(commonPosition);

  return ProjectResult(clipPosition, commonPosition);
}

// A convenience overload that returns only the clip-space position.
fn project_position_to_clipspace(
    position: vec3<f32>,
    position64Low: vec3<f32>,
    offset: vec3<f32>
) -> vec4<f32> {
  return project_position_to_clipspace_and_commonspace(position, position64Low, offset).clipPosition;
}
`,
	vs: `\
vec4 project_position_to_clipspace(
  vec3 position, vec3 position64Low, vec3 offset, out vec4 commonPosition
) {
  vec3 projectedPosition = project_position(position, position64Low);
  mat3 rotation;
  if (project_needs_rotation(projectedPosition, rotation)) {
    // offset is specified as ENU
    // when in globe projection, rotate offset so that the ground alighs with the surface of the globe
    offset = rotation * offset;
  }
  commonPosition = vec4(projectedPosition + offset, 1.0);
  return project_common_position_to_clipspace(commonPosition);
}

vec4 project_position_to_clipspace(
  vec3 position, vec3 position64Low, vec3 offset
) {
  vec4 commonPosition;
  return project_position_to_clipspace(position, position64Low, offset, commonPosition);
}
`
};
//#endregion
//#region node_modules/@deck.gl/core/dist/shaderlib/picking/picking.js
var sourceWGSL = `\
struct pickingUniforms {
  isActive: f32,
  isAttribute: f32,
  isHighlightActive: f32,
  useByteColors: f32,
  highlightedObjectColor: vec3<f32>,
  highlightColor: vec4<f32>,
};

@group(0) @binding(auto) var<uniform> picking: pickingUniforms;

fn picking_normalizeColor(color: vec3<f32>) -> vec3<f32> {
  return select(color, color / 255.0, picking.useByteColors > 0.5);
}

fn picking_normalizeColor4(color: vec4<f32>) -> vec4<f32> {
  return select(color, color / 255.0, picking.useByteColors > 0.5);
}

fn picking_isColorZero(color: vec3<f32>) -> bool {
  return dot(color, vec3<f32>(1.0)) < 0.00001;
}

fn picking_isColorValid(color: vec3<f32>) -> bool {
  return dot(color, vec3<f32>(1.0)) > 0.00001;
}
`;
var picking_default = {
	...picking,
	source: sourceWGSL,
	defaultUniforms: {
		...picking.defaultUniforms,
		useByteColors: true
	},
	inject: {
		"vs:DECKGL_FILTER_GL_POSITION": `
    // for picking depth values
    picking_setPickingAttribute(position.z / position.w);
  `,
		"vs:DECKGL_FILTER_COLOR": `
  picking_setPickingColor(geometry.pickingColor);
  `,
		"fs:DECKGL_FILTER_COLOR": {
			order: 99,
			injection: `
  // use highlight color if this fragment belongs to the selected object.
  color = picking_filterHighlightColor(color);

  // use picking color if rendering to picking FBO.
  color = picking_filterPickingColor(color);
    `
		}
	}
};
//#endregion
//#region node_modules/@deck.gl/core/dist/shaderlib/project/project-functions.js
/**
* Projection utils
* TODO: move to Viewport class?
*/
var DEFAULT_COORDINATE_ORIGIN = [
	0,
	0,
	0
];
function lngLatZToWorldPosition(lngLatZ, viewport, offsetMode = false) {
	const p = viewport.projectPosition(lngLatZ);
	if (offsetMode && viewport instanceof WebMercatorViewport) {
		const [longitude, latitude, z = 0] = lngLatZ;
		p[2] = z * viewport.getDistanceScales([longitude, latitude]).unitsPerMeter[2];
	}
	return p;
}
function normalizeParameters(opts) {
	const { viewport, modelMatrix, coordinateOrigin } = opts;
	let { coordinateSystem, fromCoordinateSystem, fromCoordinateOrigin } = opts;
	if (coordinateSystem === "default") coordinateSystem = viewport.isGeospatial ? "lnglat" : "cartesian";
	if (fromCoordinateSystem === void 0) fromCoordinateSystem = coordinateSystem;
	else if (fromCoordinateSystem === "default") fromCoordinateSystem = viewport.isGeospatial ? "lnglat" : "cartesian";
	if (fromCoordinateOrigin === void 0) fromCoordinateOrigin = coordinateOrigin;
	return {
		viewport,
		coordinateSystem,
		coordinateOrigin,
		modelMatrix,
		fromCoordinateSystem,
		fromCoordinateOrigin
	};
}
/** Get the common space position from world coordinates in the given coordinate system */
function getWorldPosition(position, { viewport, modelMatrix, coordinateSystem, coordinateOrigin, offsetMode }) {
	let [x, y, z = 0] = position;
	if (modelMatrix) [x, y, z] = transformMat4([], [
		x,
		y,
		z,
		1
	], modelMatrix);
	switch (coordinateSystem) {
		case "default": return getWorldPosition(position, {
			viewport,
			modelMatrix,
			coordinateSystem: viewport.isGeospatial ? "lnglat" : "cartesian",
			coordinateOrigin,
			offsetMode
		});
		case "lnglat": return lngLatZToWorldPosition([
			x,
			y,
			z
		], viewport, offsetMode);
		case "lnglat-offsets": return lngLatZToWorldPosition([
			x + coordinateOrigin[0],
			y + coordinateOrigin[1],
			z + (coordinateOrigin[2] || 0)
		], viewport, offsetMode);
		case "meter-offsets": return lngLatZToWorldPosition(addMetersToLngLat(coordinateOrigin, [
			x,
			y,
			z
		]), viewport, offsetMode);
		case "cartesian": return viewport.isGeospatial ? [
			x + coordinateOrigin[0],
			y + coordinateOrigin[1],
			z + coordinateOrigin[2]
		] : viewport.projectPosition([
			x,
			y,
			z
		]);
		default: throw new Error(`Invalid coordinateSystem: ${coordinateSystem}`);
	}
}
/**
* Equivalent to project_position in project.glsl
* projects a user supplied position to world position directly with or without
* a reference coordinate system
*/
function projectPosition(position, params) {
	const { viewport, coordinateSystem, coordinateOrigin, modelMatrix, fromCoordinateSystem, fromCoordinateOrigin } = normalizeParameters(params);
	const { autoOffset = true } = params;
	const { geospatialOrigin = DEFAULT_COORDINATE_ORIGIN, shaderCoordinateOrigin = DEFAULT_COORDINATE_ORIGIN, offsetMode = false } = autoOffset ? getOffsetOrigin(viewport, coordinateSystem, coordinateOrigin) : {};
	const worldPosition = getWorldPosition(position, {
		viewport,
		modelMatrix,
		coordinateSystem: fromCoordinateSystem,
		coordinateOrigin: fromCoordinateOrigin,
		offsetMode
	});
	if (offsetMode) sub(worldPosition, worldPosition, viewport.projectPosition(geospatialOrigin || shaderCoordinateOrigin));
	return worldPosition;
}
//#endregion
//#region node_modules/@luma.gl/engine/dist/compute/buffer-transform.js
/**
* Manages a WebGL program (pipeline) for buffer→buffer transforms.
* @note Only works under WebGL2.
*/
var BufferTransform = class BufferTransform {
	device;
	model;
	transformFeedback;
	static defaultProps = {
		...Model.defaultProps,
		outputs: void 0,
		feedbackBuffers: void 0
	};
	static isSupported(device) {
		return device?.info?.type === "webgl";
	}
	constructor(device, props = BufferTransform.defaultProps) {
		if (!BufferTransform.isSupported(device)) throw new Error("BufferTransform not yet implemented on WebGPU");
		this.device = device;
		this.model = new Model(this.device, {
			id: props.id || "buffer-transform-model",
			fs: props.fs || getPassthroughFS(),
			topology: props.topology || "point-list",
			varyings: props.outputs || props.varyings,
			...props
		});
		this.transformFeedback = this.device.createTransformFeedback({
			layout: this.model.pipeline.shaderLayout,
			buffers: props.feedbackBuffers
		});
		this.model.setTransformFeedback(this.transformFeedback);
		Object.seal(this);
	}
	/** Destroy owned resources. */
	destroy() {
		if (this.model) this.model.destroy();
	}
	/** @deprecated Use {@link destroy}. */
	delete() {
		this.destroy();
	}
	/** Run one transform loop. */
	run(options) {
		if (options?.inputBuffers) this.model.setAttributes(options.inputBuffers);
		if (options?.outputBuffers) this.transformFeedback.setBuffers(options.outputBuffers);
		const renderPass = this.device.beginRenderPass(options);
		this.model.draw(renderPass);
		renderPass.end();
	}
	/** @deprecated App knows what buffers it is passing in - Returns the {@link Buffer} or {@link BufferRange} for given varying name. */
	getBuffer(varyingName) {
		return this.transformFeedback.getBuffer(varyingName);
	}
	/** @deprecated App knows what buffers it is passing in - Reads the {@link Buffer} or {@link BufferRange} for given varying name. */
	readAsync(varyingName) {
		const result = this.getBuffer(varyingName);
		if (!result) throw new Error("BufferTransform#getBuffer");
		if (result instanceof Buffer) return result.readAsync();
		const { buffer, byteOffset = 0, byteLength = buffer.byteLength } = result;
		return buffer.readAsync(byteOffset, byteLength);
	}
};
//#endregion
//#region node_modules/@deck.gl/core/dist/lifecycle/constants.js
var LIFECYCLE = {
	NO_STATE: "Awaiting state",
	MATCHED: "Matched. State transferred from previous layer",
	INITIALIZED: "Initialized",
	AWAITING_GC: "Discarded. Awaiting garbage collection",
	AWAITING_FINALIZATION: "No longer matched. Awaiting garbage collection",
	FINALIZED: "Finalized! Awaiting garbage collection"
};
var COMPONENT_SYMBOL = Symbol.for("component");
var PROP_TYPES_SYMBOL = Symbol.for("propTypes");
var DEPRECATED_PROPS_SYMBOL = Symbol.for("deprecatedProps");
var ASYNC_DEFAULTS_SYMBOL = Symbol.for("asyncPropDefaults");
var ASYNC_ORIGINAL_SYMBOL = Symbol.for("asyncPropOriginal");
var ASYNC_RESOLVED_SYMBOL = Symbol.for("asyncPropResolved");
//#endregion
//#region node_modules/@deck.gl/core/dist/utils/flatten.js
/**
* Flattens a nested array into a single level array,
* or a single value into an array with one value
* @example flatten([[1, [2]], [3], 4]) => [1, 2, 3, 4]
* @example flatten(1) => [1]
* @param array The array to flatten.
* @param filter= - Optional predicate called on each `value` to
*   determine if it should be included (pushed onto) the resulting array.
* @return Returns the new flattened array (new array or `result` if provided)
*/
function flatten(array, filter = () => true) {
	if (!Array.isArray(array)) return filter(array) ? [array] : [];
	return flattenArray(array, filter, []);
}
/** Deep flattens an array. Helper to `flatten`, see its parameters */
function flattenArray(array, filter, result) {
	let index = -1;
	while (++index < array.length) {
		const value = array[index];
		if (Array.isArray(value)) flattenArray(value, filter, result);
		else if (filter(value)) result.push(value);
	}
	return result;
}
/** Uses copyWithin to significantly speed up typed array value filling */
function fillArray({ target, source, start = 0, count = 1 }) {
	const length = source.length;
	const total = count * length;
	let copied = 0;
	for (let i = start; copied < length; copied++) target[i++] = source[copied];
	while (copied < total) if (copied < total - copied) {
		target.copyWithin(start + copied, start, start + copied);
		copied *= 2;
	} else {
		target.copyWithin(start + copied, start, start + total - copied);
		copied = total;
	}
	return target;
}
//#endregion
//#region node_modules/@deck.gl/core/dist/transitions/transition.js
var Transition = class {
	/**
	* @params timeline {Timeline}
	*/
	constructor(timeline) {
		this._inProgress = false;
		this._handle = null;
		this.time = 0;
		this.settings = { duration: 0 };
		this._timeline = timeline;
	}
	get inProgress() {
		return this._inProgress;
	}
	/**
	* (re)start this transition.
	* @params props {object} - optional overriding props. see constructor
	*/
	start(settings) {
		this.cancel();
		this.settings = settings;
		this._inProgress = true;
		this.settings.onStart?.(this);
	}
	/**
	* end this transition if it is in progress.
	*/
	end() {
		if (this._inProgress) {
			this._timeline.removeChannel(this._handle);
			this._handle = null;
			this._inProgress = false;
			this.settings.onEnd?.(this);
		}
	}
	/**
	* cancel this transition if it is in progress.
	*/
	cancel() {
		if (this._inProgress) {
			this.settings.onInterrupt?.(this);
			this._timeline.removeChannel(this._handle);
			this._handle = null;
			this._inProgress = false;
		}
	}
	/**
	* update this transition. Returns `true` if updated.
	*/
	update() {
		if (!this._inProgress) return false;
		if (this._handle === null) {
			const { _timeline: timeline, settings } = this;
			this._handle = timeline.addChannel({
				delay: timeline.getTime(),
				duration: settings.duration
			});
		}
		this.time = this._timeline.getTime(this._handle);
		this._onUpdate();
		this.settings.onUpdate?.(this);
		if (this._timeline.isFinished(this._handle)) this.end();
		return true;
	}
	_onUpdate() {}
};
//#endregion
//#region node_modules/@deck.gl/core/dist/utils/assert.js
function assert(condition, message) {
	if (!condition) throw new Error(message || "deck.gl: assertion failed.");
}
//#endregion
//#region node_modules/@deck.gl/core/dist/lib/attribute/gl-utils.js
function typedArrayFromDataType(type) {
	switch (type) {
		case "float64": return Float64Array;
		case "uint8":
		case "unorm8": return Uint8ClampedArray;
		default: return getTypedArrayConstructor(type);
	}
}
var dataTypeFromTypedArray = dataTypeDecoder.getDataType.bind(dataTypeDecoder);
function getBufferAttributeLayout(name, accessor, deviceType) {
	if (accessor.size > 4) return null;
	const type = deviceType === "webgpu" && accessor.type === "uint8" ? "unorm8" : accessor.type;
	return {
		attribute: name,
		format: accessor.size > 1 ? `${type}x${accessor.size}` : accessor.type,
		byteOffset: accessor.offset || 0
	};
}
function getStride(accessor) {
	return accessor.stride || accessor.size * accessor.bytesPerElement;
}
function bufferLayoutEqual(accessor1, accessor2) {
	return accessor1.type === accessor2.type && accessor1.size === accessor2.size && getStride(accessor1) === getStride(accessor2) && (accessor1.offset || 0) === (accessor2.offset || 0);
}
//#endregion
//#region node_modules/@deck.gl/core/dist/lib/attribute/data-column.js
function resolveShaderAttribute(baseAccessor, shaderAttributeOptions) {
	if (shaderAttributeOptions.offset) defaultLogger.removed("shaderAttribute.offset", "vertexOffset, elementOffset")();
	const stride = getStride(baseAccessor);
	const vertexOffset = shaderAttributeOptions.vertexOffset !== void 0 ? shaderAttributeOptions.vertexOffset : baseAccessor.vertexOffset || 0;
	const elementOffset = shaderAttributeOptions.elementOffset || 0;
	const offset = vertexOffset * stride + elementOffset * baseAccessor.bytesPerElement + (baseAccessor.offset || 0);
	return {
		...shaderAttributeOptions,
		offset,
		stride
	};
}
function resolveDoublePrecisionShaderAttributes(baseAccessor, shaderAttributeOptions) {
	const resolvedOptions = resolveShaderAttribute(baseAccessor, shaderAttributeOptions);
	return {
		high: resolvedOptions,
		low: {
			...resolvedOptions,
			offset: resolvedOptions.offset + baseAccessor.size * 4
		}
	};
}
var DataColumn = class {
	constructor(device, opts, state) {
		this._buffer = null;
		this.device = device;
		this.id = opts.id || "";
		this.size = opts.size || 1;
		const logicalType = opts.logicalType || opts.type;
		const doublePrecision = logicalType === "float64";
		let { defaultValue } = opts;
		defaultValue = Number.isFinite(defaultValue) ? [defaultValue] : defaultValue || new Array(this.size).fill(0);
		let bufferType;
		if (doublePrecision) bufferType = "float32";
		else if (!logicalType && opts.isIndexed) bufferType = "uint32";
		else bufferType = logicalType || "float32";
		let defaultType = typedArrayFromDataType(logicalType || bufferType);
		this.doublePrecision = doublePrecision;
		if (doublePrecision && opts.fp64 === false) defaultType = Float32Array;
		this.value = null;
		this.settings = {
			...opts,
			defaultType,
			defaultValue,
			logicalType,
			type: bufferType,
			normalized: bufferType.includes("norm"),
			size: this.size,
			bytesPerElement: defaultType.BYTES_PER_ELEMENT
		};
		this.state = {
			...state,
			externalBuffer: null,
			bufferAccessor: this.settings,
			allocatedValue: null,
			numInstances: 0,
			bounds: null,
			constant: false
		};
	}
	get isConstant() {
		return this.state.constant;
	}
	get buffer() {
		return this._buffer;
	}
	get byteOffset() {
		const accessor = this.getAccessor();
		if (accessor.vertexOffset) return accessor.vertexOffset * getStride(accessor);
		return 0;
	}
	get numInstances() {
		return this.state.numInstances;
	}
	set numInstances(n) {
		this.state.numInstances = n;
	}
	delete() {
		if (this._buffer) {
			this._buffer.delete();
			this._buffer = null;
		}
		typed_array_manager_default.release(this.state.allocatedValue);
	}
	getBuffer() {
		if (this.state.constant) return null;
		return this.state.externalBuffer || this._buffer;
	}
	getValue(attributeName = this.id, options = null) {
		const result = {};
		if (this.state.constant) {
			const value = this.value;
			if (options) {
				const shaderAttributeDef = resolveShaderAttribute(this.getAccessor(), options);
				const offset = shaderAttributeDef.offset / value.BYTES_PER_ELEMENT;
				const size = shaderAttributeDef.size || this.size;
				result[attributeName] = value.subarray(offset, offset + size);
			} else result[attributeName] = value;
		} else result[attributeName] = this.getBuffer();
		if (this.doublePrecision) if (this.value instanceof Float64Array) result[`${attributeName}64Low`] = result[attributeName];
		else result[`${attributeName}64Low`] = new Float32Array(this.size);
		return result;
	}
	_getBufferLayout(attributeName = this.id, options = null) {
		const accessor = this.getAccessor();
		const attributes = [];
		const result = {
			name: this.id,
			byteStride: getStride(accessor)
		};
		if (this.doublePrecision) {
			const doubleShaderAttributeDefs = resolveDoublePrecisionShaderAttributes(accessor, options || {});
			attributes.push(getBufferAttributeLayout(attributeName, {
				...accessor,
				...doubleShaderAttributeDefs.high
			}, this.device.type), getBufferAttributeLayout(`${attributeName}64Low`, {
				...accessor,
				...doubleShaderAttributeDefs.low
			}, this.device.type));
		} else if (options) {
			const shaderAttributeDef = resolveShaderAttribute(accessor, options);
			attributes.push(getBufferAttributeLayout(attributeName, {
				...accessor,
				...shaderAttributeDef
			}, this.device.type));
		} else attributes.push(getBufferAttributeLayout(attributeName, accessor, this.device.type));
		result.attributes = attributes.filter(Boolean);
		return result;
	}
	setAccessor(accessor) {
		this.state.bufferAccessor = accessor;
	}
	getAccessor() {
		return this.state.bufferAccessor;
	}
	getBounds() {
		if (this.state.bounds) return this.state.bounds;
		let result = null;
		if (this.state.constant && this.value) {
			const min = Array.from(this.value);
			result = [min, min];
		} else {
			const { value, numInstances, size } = this;
			const len = numInstances * size;
			if (value && len && value.length >= len) {
				const min = new Array(size).fill(Infinity);
				const max = new Array(size).fill(-Infinity);
				for (let i = 0; i < len;) for (let j = 0; j < size; j++) {
					const v = value[i++];
					if (v < min[j]) min[j] = v;
					if (v > max[j]) max[j] = v;
				}
				result = [min, max];
			}
		}
		this.state.bounds = result;
		return result;
	}
	setData(data) {
		const { state } = this;
		let opts;
		if (ArrayBuffer.isView(data)) opts = { value: data };
		else if (data instanceof Buffer) opts = { buffer: data };
		else opts = data;
		const accessor = {
			...this.settings,
			...opts
		};
		if (ArrayBuffer.isView(opts.value)) {
			if (!opts.type) if (this.doublePrecision && opts.value instanceof Float64Array) accessor.type = "float32";
			else {
				const type = dataTypeFromTypedArray(opts.value);
				accessor.type = accessor.normalized ? type.replace("int", "norm") : type;
			}
			accessor.bytesPerElement = opts.value.BYTES_PER_ELEMENT;
			accessor.stride = getStride(accessor);
		}
		state.bounds = null;
		if (opts.constant) {
			let value = opts.value;
			value = this._normalizeValue(value, [], 0);
			if (this.settings.normalized) value = this.normalizeConstant(value);
			if (!(!state.constant || !this._areValuesEqual(value, this.value))) return false;
			state.externalBuffer = null;
			state.constant = true;
			this.value = ArrayBuffer.isView(value) ? value : new Float32Array(value);
		} else if (opts.buffer) {
			state.externalBuffer = opts.buffer;
			state.constant = false;
			this.value = opts.value || null;
		} else if (opts.value) {
			this._checkExternalBuffer(opts);
			let value = opts.value;
			state.externalBuffer = null;
			state.constant = false;
			this.value = value;
			let { buffer } = this;
			const stride = getStride(accessor);
			const byteOffset = (accessor.vertexOffset || 0) * stride;
			if (this.doublePrecision && value instanceof Float64Array) value = toDoublePrecisionArray(value, accessor);
			if (this.settings.isIndexed) {
				const ArrayType = this.settings.defaultType;
				if (value.constructor !== ArrayType) value = new ArrayType(value);
			}
			const requiredBufferSize = value.byteLength + byteOffset + stride * 2;
			if (!buffer || buffer.byteLength < requiredBufferSize) buffer = this._createBuffer(requiredBufferSize);
			buffer.write(value, byteOffset);
		}
		this.setAccessor(accessor);
		return true;
	}
	updateSubBuffer(opts = {}) {
		this.state.bounds = null;
		const value = this.value;
		const { startOffset = 0, endOffset } = opts;
		this.buffer.write(this.doublePrecision && value instanceof Float64Array ? toDoublePrecisionArray(value, {
			size: this.size,
			startIndex: startOffset,
			endIndex: endOffset
		}) : value.subarray(startOffset, endOffset), startOffset * value.BYTES_PER_ELEMENT + this.byteOffset);
	}
	allocate(numInstances, copy = false) {
		const { state } = this;
		const oldValue = state.allocatedValue;
		const value = typed_array_manager_default.allocate(oldValue, numInstances + 1, {
			size: this.size,
			type: this.settings.defaultType,
			copy
		});
		this.value = value;
		const { byteOffset } = this;
		let { buffer } = this;
		if (!buffer || buffer.byteLength < value.byteLength + byteOffset) {
			buffer = this._createBuffer(value.byteLength + byteOffset);
			if (copy && oldValue) buffer.write(oldValue instanceof Float64Array ? toDoublePrecisionArray(oldValue, this) : oldValue, byteOffset);
		}
		state.allocatedValue = value;
		state.constant = false;
		state.externalBuffer = null;
		this.setAccessor(this.settings);
		return true;
	}
	_checkExternalBuffer(opts) {
		const { value } = opts;
		if (!ArrayBuffer.isView(value)) throw new Error(`Attribute ${this.id} value is not TypedArray`);
		const ArrayType = this.settings.defaultType;
		let illegalArrayType = false;
		if (this.doublePrecision) illegalArrayType = value.BYTES_PER_ELEMENT < 4;
		if (illegalArrayType) throw new Error(`Attribute ${this.id} does not support ${value.constructor.name}`);
		if (!(value instanceof ArrayType) && this.settings.normalized && !("normalized" in opts)) defaultLogger.warn(`Attribute ${this.id} is normalized`)();
	}
	normalizeConstant(value) {
		switch (this.settings.type) {
			case "snorm8": return new Float32Array(value).map((x) => (x + 128) / 255 * 2 - 1);
			case "snorm16": return new Float32Array(value).map((x) => (x + 32768) / 65535 * 2 - 1);
			case "unorm8": return new Float32Array(value).map((x) => x / 255);
			case "unorm16": return new Float32Array(value).map((x) => x / 65535);
			default: return value;
		}
	}
	_normalizeValue(value, out, start) {
		const { defaultValue, size } = this.settings;
		if (Number.isFinite(value)) {
			out[start] = value;
			return out;
		}
		if (!value) {
			let i = size;
			while (--i >= 0) out[start + i] = defaultValue[i];
			return out;
		}
		switch (size) {
			case 4: out[start + 3] = Number.isFinite(value[3]) ? value[3] : defaultValue[3];
			case 3: out[start + 2] = Number.isFinite(value[2]) ? value[2] : defaultValue[2];
			case 2: out[start + 1] = Number.isFinite(value[1]) ? value[1] : defaultValue[1];
			case 1:
				out[start + 0] = Number.isFinite(value[0]) ? value[0] : defaultValue[0];
				break;
			default:
				let i = size;
				while (--i >= 0) out[start + i] = Number.isFinite(value[i]) ? value[i] : defaultValue[i];
		}
		return out;
	}
	_areValuesEqual(value1, value2) {
		if (!value1 || !value2) return false;
		const { size } = this;
		for (let i = 0; i < size; i++) if (value1[i] !== value2[i]) return false;
		return true;
	}
	_createBuffer(byteLength) {
		if (this._buffer) this._buffer.destroy();
		const { isIndexed, type } = this.settings;
		this._buffer = this.device.createBuffer({
			...this._buffer?.props,
			id: this.id,
			usage: (isIndexed ? Buffer.INDEX : Buffer.VERTEX) | Buffer.COPY_DST,
			indexType: isIndexed ? type : void 0,
			byteLength
		});
		return this._buffer;
	}
};
//#endregion
//#region node_modules/@deck.gl/core/dist/utils/iterable-utils.js
var EMPTY_ARRAY$1 = [];
var placeholderArray = [];
function createIterable(data, startRow = 0, endRow = Infinity) {
	let iterable = EMPTY_ARRAY$1;
	const objectInfo = {
		index: -1,
		data,
		target: []
	};
	if (!data) iterable = EMPTY_ARRAY$1;
	else if (typeof data[Symbol.iterator] === "function") iterable = data;
	else if (data.length > 0) {
		placeholderArray.length = data.length;
		iterable = placeholderArray;
	}
	if (startRow > 0 || Number.isFinite(endRow)) {
		iterable = (Array.isArray(iterable) ? iterable : Array.from(iterable)).slice(startRow, endRow);
		objectInfo.index = startRow - 1;
	}
	return {
		iterable,
		objectInfo
	};
}
function isAsyncIterable(data) {
	return data && data[Symbol.asyncIterator];
}
function getAccessorFromBuffer(typedArray, options) {
	const { size, stride, offset, startIndices, nested } = options;
	const bytesPerElement = typedArray.BYTES_PER_ELEMENT;
	const elementStride = stride ? stride / bytesPerElement : size;
	const elementOffset = offset ? offset / bytesPerElement : 0;
	const vertexCount = Math.floor((typedArray.length - elementOffset) / elementStride);
	return (_, { index, target }) => {
		if (!startIndices) {
			const sourceIndex = index * elementStride + elementOffset;
			for (let j = 0; j < size; j++) target[j] = typedArray[sourceIndex + j];
			return target;
		}
		const startIndex = startIndices[index];
		const endIndex = startIndices[index + 1] || vertexCount;
		let result;
		if (nested) {
			result = new Array(endIndex - startIndex);
			for (let i = startIndex; i < endIndex; i++) {
				const sourceIndex = i * elementStride + elementOffset;
				target = new Array(size);
				for (let j = 0; j < size; j++) target[j] = typedArray[sourceIndex + j];
				result[i - startIndex] = target;
			}
		} else if (elementStride === size) result = typedArray.subarray(startIndex * size + elementOffset, endIndex * size + elementOffset);
		else {
			result = new typedArray.constructor((endIndex - startIndex) * size);
			let targetIndex = 0;
			for (let i = startIndex; i < endIndex; i++) {
				const sourceIndex = i * elementStride + elementOffset;
				for (let j = 0; j < size; j++) result[targetIndex++] = typedArray[sourceIndex + j];
			}
		}
		return result;
	};
}
//#endregion
//#region node_modules/@deck.gl/core/dist/utils/range.js
var EMPTY = [];
var FULL = [[0, Infinity]];
function add(rangeList, range) {
	if (rangeList === FULL) return rangeList;
	if (range[0] < 0) range[0] = 0;
	if (range[0] >= range[1]) return rangeList;
	const newRangeList = [];
	const len = rangeList.length;
	let insertPosition = 0;
	for (let i = 0; i < len; i++) {
		const range0 = rangeList[i];
		if (range0[1] < range[0]) {
			newRangeList.push(range0);
			insertPosition = i + 1;
		} else if (range0[0] > range[1]) newRangeList.push(range0);
		else range = [Math.min(range0[0], range[0]), Math.max(range0[1], range[1])];
	}
	newRangeList.splice(insertPosition, 0, range);
	return newRangeList;
}
//#endregion
//#region node_modules/@deck.gl/core/dist/lib/attribute/transition-settings.js
var DEFAULT_TRANSITION_SETTINGS = {
	interpolation: {
		duration: 0,
		easing: (t) => t
	},
	spring: {
		stiffness: .05,
		damping: .5
	}
};
function normalizeTransitionSettings(userSettings, layerSettings) {
	if (!userSettings) return null;
	if (Number.isFinite(userSettings)) userSettings = {
		type: "interpolation",
		duration: userSettings
	};
	const type = userSettings.type || "interpolation";
	return {
		...DEFAULT_TRANSITION_SETTINGS[type],
		...layerSettings,
		...userSettings,
		type
	};
}
//#endregion
//#region node_modules/@deck.gl/core/dist/lib/attribute/attribute.js
var Attribute = class extends DataColumn {
	constructor(device, opts) {
		super(device, opts, {
			startIndices: null,
			lastExternalBuffer: null,
			binaryValue: null,
			binaryAccessor: null,
			needsUpdate: true,
			needsRedraw: false,
			layoutChanged: false,
			updateRanges: FULL
		});
		/** Legacy approach to set attribute value - read `isConstant` instead for attribute state */
		this.constant = false;
		this.settings.update = opts.update || (opts.accessor ? this._autoUpdater : void 0);
		Object.seal(this.settings);
		Object.seal(this.state);
		this._validateAttributeUpdaters();
	}
	get startIndices() {
		return this.state.startIndices;
	}
	set startIndices(layout) {
		this.state.startIndices = layout;
	}
	needsUpdate() {
		return this.state.needsUpdate;
	}
	needsRedraw({ clearChangedFlags = false } = {}) {
		const needsRedraw = this.state.needsRedraw;
		this.state.needsRedraw = needsRedraw && !clearChangedFlags;
		return needsRedraw;
	}
	layoutChanged() {
		return this.state.layoutChanged;
	}
	setAccessor(accessor) {
		var _a;
		(_a = this.state).layoutChanged || (_a.layoutChanged = !bufferLayoutEqual(accessor, this.getAccessor()));
		super.setAccessor(accessor);
	}
	getUpdateTriggers() {
		const { accessor } = this.settings;
		return [this.id].concat(typeof accessor !== "function" && accessor || []);
	}
	supportsTransition() {
		return Boolean(this.settings.transition);
	}
	getTransitionSetting(opts) {
		if (!opts || !this.supportsTransition()) return null;
		const { accessor } = this.settings;
		const layerSettings = this.settings.transition;
		return normalizeTransitionSettings(Array.isArray(accessor) ? opts[accessor.find((a) => opts[a])] : opts[accessor], layerSettings);
	}
	setNeedsUpdate(reason = this.id, dataRange) {
		this.state.needsUpdate = this.state.needsUpdate || reason;
		this.setNeedsRedraw(reason);
		if (dataRange) {
			const { startRow = 0, endRow = Infinity } = dataRange;
			this.state.updateRanges = add(this.state.updateRanges, [startRow, endRow]);
		} else this.state.updateRanges = FULL;
	}
	clearNeedsUpdate() {
		this.state.needsUpdate = false;
		this.state.updateRanges = EMPTY;
	}
	setNeedsRedraw(reason = this.id) {
		this.state.needsRedraw = this.state.needsRedraw || reason;
	}
	allocate(numInstances) {
		const { state, settings } = this;
		if (settings.noAlloc) return false;
		if (settings.update) {
			super.allocate(numInstances, state.updateRanges !== FULL);
			return true;
		}
		return false;
	}
	updateBuffer({ numInstances, data, props, context }) {
		if (!this.needsUpdate()) return false;
		const { state: { updateRanges }, settings: { update, noAlloc } } = this;
		let updated = true;
		if (update) {
			for (const [startRow, endRow] of updateRanges) update.call(context, this, {
				data,
				startRow,
				endRow,
				props,
				numInstances
			});
			if (!this.value) {} else if (this.constant || !this.buffer || this.buffer.byteLength < this.value.byteLength + this.byteOffset) {
				if (this.constant) this.setConstantValue(context, this.value);
				else this.setData({
					value: this.value,
					constant: this.constant
				});
				this.constant = false;
			} else for (const [startRow, endRow] of updateRanges) {
				const startOffset = Number.isFinite(startRow) ? this.getVertexOffset(startRow) : 0;
				const endOffset = Number.isFinite(endRow) ? this.getVertexOffset(endRow) : noAlloc || !Number.isFinite(numInstances) ? this.value.length : numInstances * this.size;
				super.updateSubBuffer({
					startOffset,
					endOffset
				});
			}
			this._checkAttributeArray();
		} else updated = false;
		this.clearNeedsUpdate();
		this.setNeedsRedraw();
		return updated;
	}
	setConstantValue(context, value) {
		if (value === void 0 || typeof value === "function") return false;
		const transformedValue = this.settings.transform && context ? this.settings.transform.call(context, value) : value;
		if (this.device.type === "webgpu") return this.setConstantBufferValue(transformedValue, this.numInstances);
		if (this.setData({
			constant: true,
			value: transformedValue
		})) this.setNeedsRedraw();
		this.clearNeedsUpdate();
		return true;
	}
	setConstantBufferValue(value, numInstances) {
		const ArrayType = this.settings.defaultType;
		const constantValue = this._normalizeValue(value, new ArrayType(this.size), 0);
		if (this._hasConstantBufferValue(constantValue, numInstances)) {
			this.constant = false;
			this.clearNeedsUpdate();
			return false;
		}
		const repeatedValue = new ArrayType(Math.max(numInstances, 1) * this.size);
		for (let i = 0; i < repeatedValue.length; i += this.size) repeatedValue.set(constantValue, i);
		const hasChanged = this.setData({ value: repeatedValue });
		this.constant = false;
		this.clearNeedsUpdate();
		if (hasChanged) this.setNeedsRedraw();
		return hasChanged;
	}
	_hasConstantBufferValue(value, numInstances) {
		const currentValue = this.value;
		const expectedLength = Math.max(numInstances, 1) * this.size;
		if (!ArrayBuffer.isView(currentValue) || currentValue.length !== expectedLength || currentValue.length % this.size !== 0) return false;
		for (let i = 0; i < currentValue.length; i += this.size) for (let j = 0; j < this.size; j++) if (currentValue[i + j] !== value[j]) return false;
		return true;
	}
	setExternalBuffer(buffer) {
		const { state } = this;
		if (!buffer) {
			state.lastExternalBuffer = null;
			return false;
		}
		this.clearNeedsUpdate();
		if (state.lastExternalBuffer === buffer) return true;
		state.lastExternalBuffer = buffer;
		this.setNeedsRedraw();
		this.setData(buffer);
		return true;
	}
	setBinaryValue(buffer, startIndices = null) {
		const { state, settings } = this;
		if (!buffer) {
			state.binaryValue = null;
			state.binaryAccessor = null;
			return false;
		}
		if (settings.noAlloc) return false;
		if (state.binaryValue === buffer) {
			this.clearNeedsUpdate();
			return true;
		}
		state.binaryValue = buffer;
		this.setNeedsRedraw();
		if (settings.transform || startIndices !== this.startIndices) {
			if (ArrayBuffer.isView(buffer)) buffer = { value: buffer };
			const binaryValue = buffer;
			assert(ArrayBuffer.isView(binaryValue.value), `invalid ${settings.accessor}`);
			const needsNormalize = Boolean(binaryValue.size) && binaryValue.size !== this.size;
			state.binaryAccessor = getAccessorFromBuffer(binaryValue.value, {
				size: binaryValue.size || this.size,
				stride: binaryValue.stride,
				offset: binaryValue.offset,
				startIndices,
				nested: needsNormalize
			});
			return false;
		}
		this.clearNeedsUpdate();
		this.setData(buffer);
		return true;
	}
	getVertexOffset(row) {
		const { startIndices } = this;
		return (startIndices ? row < startIndices.length ? startIndices[row] : this.numInstances : row) * this.size;
	}
	getValue() {
		const shaderAttributeDefs = this.settings.shaderAttributes;
		const result = super.getValue();
		if (!shaderAttributeDefs) return result;
		for (const shaderAttributeName in shaderAttributeDefs) Object.assign(result, super.getValue(shaderAttributeName, shaderAttributeDefs[shaderAttributeName]));
		return result;
	}
	/** Generate WebGPU-style buffer layout descriptor from this attribute */
	getBufferLayout(modelInfo) {
		this.state.layoutChanged = false;
		const shaderAttributeDefs = this.settings.shaderAttributes;
		const result = super._getBufferLayout();
		const { stepMode } = this.settings;
		if (stepMode === "dynamic") result.stepMode = modelInfo ? modelInfo.isInstanced ? "instance" : "vertex" : "instance";
		else result.stepMode = stepMode ?? "vertex";
		if (!shaderAttributeDefs) return result;
		for (const shaderAttributeName in shaderAttributeDefs) {
			const map = super._getBufferLayout(shaderAttributeName, shaderAttributeDefs[shaderAttributeName]);
			result.attributes.push(...map.attributes);
		}
		return result;
	}
	_autoUpdater(attribute, { data, startRow, endRow, props, numInstances }) {
		const { settings, state, value, size, startIndices } = attribute;
		const { accessor, transform } = settings;
		const accessorFunc = state.binaryAccessor || (typeof accessor === "function" ? accessor : props[accessor]);
		assert(typeof accessorFunc === "function", `accessor "${accessor}" is not a function`);
		let i = attribute.getVertexOffset(startRow);
		const { iterable, objectInfo } = createIterable(data, startRow, endRow);
		for (const object of iterable) {
			objectInfo.index++;
			let objectValue = accessorFunc(object, objectInfo);
			if (transform) objectValue = transform.call(this, objectValue);
			if (startIndices) {
				const numVertices = (objectInfo.index < startIndices.length - 1 ? startIndices[objectInfo.index + 1] : numInstances) - startIndices[objectInfo.index];
				if (objectValue && Array.isArray(objectValue[0])) {
					let startIndex = i;
					for (const item of objectValue) {
						attribute._normalizeValue(item, value, startIndex);
						startIndex += size;
					}
				} else if (objectValue && objectValue.length > size) value.set(objectValue, i);
				else {
					attribute._normalizeValue(objectValue, objectInfo.target, 0);
					fillArray({
						target: value,
						source: objectInfo.target,
						start: i,
						count: numVertices
					});
				}
				i += numVertices * size;
			} else {
				attribute._normalizeValue(objectValue, value, i);
				i += size;
			}
		}
	}
	_validateAttributeUpdaters() {
		const { settings } = this;
		if (!(settings.noAlloc || typeof settings.update === "function")) throw new Error(`Attribute ${this.id} missing update or accessor`);
	}
	_checkAttributeArray() {
		const { value } = this;
		const limit = Math.min(4, this.size);
		if (value && value.length >= limit) {
			let valid = true;
			switch (limit) {
				case 4: valid = valid && Number.isFinite(value[3]);
				case 3: valid = valid && Number.isFinite(value[2]);
				case 2: valid = valid && Number.isFinite(value[1]);
				case 1:
					valid = valid && Number.isFinite(value[0]);
					break;
				default: valid = false;
			}
			if (!valid) throw new Error(`Illegal attribute generated for ${this.id}`);
		}
	}
};
//#endregion
//#region node_modules/@deck.gl/core/dist/utils/array-utils.js
function padArrayChunk(options) {
	const { source, target, start = 0, size, getData } = options;
	const end = options.end || target.length;
	const sourceLength = source.length;
	const targetLength = end - start;
	if (sourceLength > targetLength) {
		target.set(source.subarray(0, targetLength), start);
		return;
	}
	target.set(source, start);
	if (!getData) return;
	let i = sourceLength;
	while (i < targetLength) {
		const datum = getData(i, source);
		for (let j = 0; j < size; j++) {
			target[start + i] = datum[j] || 0;
			i++;
		}
	}
}
function padArray({ source, target, size, getData, sourceStartIndices, targetStartIndices }) {
	if (!sourceStartIndices || !targetStartIndices) {
		padArrayChunk({
			source,
			target,
			size,
			getData
		});
		return target;
	}
	let sourceIndex = 0;
	let targetIndex = 0;
	const getChunkData = getData && ((i, chunk) => getData(i + targetIndex, chunk));
	const n = Math.min(sourceStartIndices.length, targetStartIndices.length);
	for (let i = 1; i < n; i++) {
		const nextSourceIndex = sourceStartIndices[i] * size;
		const nextTargetIndex = targetStartIndices[i] * size;
		padArrayChunk({
			source: source.subarray(sourceIndex, nextSourceIndex),
			target,
			start: targetIndex,
			end: nextTargetIndex,
			size,
			getData: getChunkData
		});
		sourceIndex = nextSourceIndex;
		targetIndex = nextTargetIndex;
	}
	if (targetIndex < target.length) padArrayChunk({
		source: [],
		target,
		start: targetIndex,
		size,
		getData: getChunkData
	});
	return target;
}
//#endregion
//#region node_modules/@deck.gl/core/dist/transitions/gpu-transition-utils.js
/** Create a new empty attribute with the same settings: type, shader layout etc. */
function cloneAttribute(attribute) {
	const { device, settings, value } = attribute;
	const newAttribute = new Attribute(device, settings);
	newAttribute.setData({
		value: value instanceof Float64Array ? new Float64Array(0) : new Float32Array(0),
		normalized: settings.normalized
	});
	return newAttribute;
}
/** Returns the GLSL attribute type for the given number of float32 components. */
function getAttributeTypeFromSize(size) {
	switch (size) {
		case 1: return "float";
		case 2: return "vec2";
		case 3: return "vec3";
		case 4: return "vec4";
		default: throw new Error(`No defined attribute type for size "${size}"`);
	}
}
/** Returns the {@link VertexFormat} for the given number of float32 components. */
function getFloat32VertexFormat(size) {
	switch (size) {
		case 1: return "float32";
		case 2: return "float32x2";
		case 3: return "float32x3";
		case 4: return "float32x4";
		default: throw new Error("invalid type size");
	}
}
function cycleBuffers(buffers) {
	buffers.push(buffers.shift());
}
function getAttributeBufferLength(attribute, numInstances) {
	const { doublePrecision, settings, value, size } = attribute;
	const multiplier = doublePrecision && value instanceof Float64Array ? 2 : 1;
	let maxVertexOffset = 0;
	const { shaderAttributes } = attribute.settings;
	if (shaderAttributes) for (const shaderAttribute of Object.values(shaderAttributes)) maxVertexOffset = Math.max(maxVertexOffset, shaderAttribute.vertexOffset ?? 0);
	return (settings.noAlloc ? value.length : (numInstances + maxVertexOffset) * size) * multiplier;
}
function matchBuffer({ device, source, target }) {
	if (!target || target.byteLength < source.byteLength) {
		target?.destroy();
		target = device.createBuffer({
			byteLength: source.byteLength,
			usage: source.usage
		});
	}
	return target;
}
function padBuffer({ device, buffer, attribute, fromLength, toLength, fromStartIndices, getData = (x) => x }) {
	const precisionMultiplier = attribute.doublePrecision && attribute.value instanceof Float64Array ? 2 : 1;
	const size = attribute.size * precisionMultiplier;
	const byteOffset = attribute.byteOffset;
	const targetByteOffset = attribute.settings.bytesPerElement < 4 ? byteOffset / attribute.settings.bytesPerElement * 4 : byteOffset;
	const toStartIndices = attribute.startIndices;
	const hasStartIndices = fromStartIndices && toStartIndices;
	const isConstant = attribute.isConstant;
	if (!hasStartIndices && buffer && fromLength >= toLength) return buffer;
	const ArrayType = attribute.value instanceof Float64Array ? Float32Array : attribute.value.constructor;
	const toData = isConstant ? attribute.value : new ArrayType(attribute.getBuffer().readSyncWebGL(byteOffset, toLength * ArrayType.BYTES_PER_ELEMENT).buffer);
	if (attribute.settings.normalized && !isConstant) {
		const getter = getData;
		getData = (value, chunk) => attribute.normalizeConstant(getter(value, chunk));
	}
	const getMissingData = isConstant ? (i, chunk) => getData(toData, chunk) : (i, chunk) => getData(toData.subarray(i + byteOffset, i + byteOffset + size), chunk);
	const source = buffer ? new Float32Array(buffer.readSyncWebGL(targetByteOffset, fromLength * 4).buffer) : new Float32Array(0);
	const target = new Float32Array(toLength);
	padArray({
		source,
		target,
		sourceStartIndices: fromStartIndices,
		targetStartIndices: toStartIndices,
		size,
		getData: getMissingData
	});
	if (!buffer || buffer.byteLength < target.byteLength + targetByteOffset) {
		buffer?.destroy();
		buffer = device.createBuffer({
			byteLength: target.byteLength + targetByteOffset,
			usage: 35050
		});
	}
	buffer.write(target, targetByteOffset);
	return buffer;
}
//#endregion
//#region node_modules/@deck.gl/core/dist/transitions/gpu-transition.js
var GPUTransitionBase = class {
	constructor({ device, attribute, timeline }) {
		this.buffers = [];
		/** The vertex count of the last buffer.
		* Buffer may be larger than the actual length we want to use
		* because we only reallocate buffers when they grow, not when they shrink,
		* due to performance costs */
		this.currentLength = 0;
		this.device = device;
		this.transition = new Transition(timeline);
		this.attribute = attribute;
		this.attributeInTransition = cloneAttribute(attribute);
		this.currentStartIndices = attribute.startIndices;
	}
	get inProgress() {
		return this.transition.inProgress;
	}
	start(transitionSettings, numInstances, duration = Infinity) {
		this.settings = transitionSettings;
		this.currentStartIndices = this.attribute.startIndices;
		this.currentLength = getAttributeBufferLength(this.attribute, numInstances);
		this.transition.start({
			...transitionSettings,
			duration
		});
	}
	update() {
		const updated = this.transition.update();
		if (updated) this.onUpdate();
		return updated;
	}
	setBuffer(buffer) {
		this.attributeInTransition.setData({
			buffer,
			normalized: this.attribute.settings.normalized,
			value: this.attributeInTransition.value
		});
	}
	cancel() {
		this.transition.cancel();
	}
	delete() {
		this.cancel();
		for (const buffer of this.buffers) buffer.destroy();
		this.buffers.length = 0;
	}
};
//#endregion
//#region node_modules/@deck.gl/core/dist/transitions/gpu-interpolation-transition.js
var GPUInterpolationTransition = class extends GPUTransitionBase {
	constructor({ device, attribute, timeline }) {
		super({
			device,
			attribute,
			timeline
		});
		this.type = "interpolation";
		this.transform = getTransform$1(device, attribute);
	}
	start(transitionSettings, numInstances) {
		const prevLength = this.currentLength;
		const prevStartIndices = this.currentStartIndices;
		super.start(transitionSettings, numInstances, transitionSettings.duration);
		if (transitionSettings.duration <= 0) {
			this.transition.cancel();
			return;
		}
		const { buffers, attribute } = this;
		cycleBuffers(buffers);
		buffers[0] = padBuffer({
			device: this.device,
			buffer: buffers[0],
			attribute,
			fromLength: prevLength,
			toLength: this.currentLength,
			fromStartIndices: prevStartIndices,
			getData: transitionSettings.enter
		});
		buffers[1] = matchBuffer({
			device: this.device,
			source: buffers[0],
			target: buffers[1]
		});
		this.setBuffer(buffers[1]);
		const { transform } = this;
		const model = transform.model;
		let vertexCount = Math.floor(this.currentLength / attribute.size);
		if (useFp64(attribute)) vertexCount /= 2;
		model.setVertexCount(vertexCount);
		if (attribute.isConstant) {
			model.setAttributes({ aFrom: buffers[0] });
			model.setConstantAttributes({ aTo: attribute.value });
		} else model.setAttributes({
			aFrom: buffers[0],
			aTo: attribute.getBuffer()
		});
		transform.transformFeedback.setBuffers({ vCurrent: buffers[1] });
	}
	onUpdate() {
		const { duration, easing } = this.settings;
		const { time } = this.transition;
		let t = time / duration;
		if (easing) t = easing(t);
		const { model } = this.transform;
		const interpolationProps = { time: t };
		model.shaderInputs.setProps({ interpolation: interpolationProps });
		this.transform.run({ discard: true });
	}
	delete() {
		super.delete();
		this.transform.destroy();
	}
};
var interpolationUniforms = {
	name: "interpolation",
	vs: `\
layout(std140) uniform interpolationUniforms {
  float time;
} interpolation;
`,
	uniformTypes: { time: "f32" }
};
var vs$1 = `\
#version 300 es
#define SHADER_NAME interpolation-transition-vertex-shader

in ATTRIBUTE_TYPE aFrom;
in ATTRIBUTE_TYPE aTo;
out ATTRIBUTE_TYPE vCurrent;

void main(void) {
  vCurrent = mix(aFrom, aTo, interpolation.time);
  gl_Position = vec4(0.0);
}
`;
var vs64 = `\
#version 300 es
#define SHADER_NAME interpolation-transition-vertex-shader

in ATTRIBUTE_TYPE aFrom;
in ATTRIBUTE_TYPE aFrom64Low;
in ATTRIBUTE_TYPE aTo;
in ATTRIBUTE_TYPE aTo64Low;
out ATTRIBUTE_TYPE vCurrent;
out ATTRIBUTE_TYPE vCurrent64Low;

vec2 mix_fp64(vec2 a, vec2 b, float x) {
  vec2 range = sub_fp64(b, a);
  return sum_fp64(a, mul_fp64(range, vec2(x, 0.0)));
}

void main(void) {
  for (int i=0; i<ATTRIBUTE_SIZE; i++) {
    vec2 value = mix_fp64(vec2(aFrom[i], aFrom64Low[i]), vec2(aTo[i], aTo64Low[i]), interpolation.time);
    vCurrent[i] = value.x;
    vCurrent64Low[i] = value.y;
  }
  gl_Position = vec4(0.0);
}
`;
function useFp64(attribute) {
	return attribute.doublePrecision && attribute.value instanceof Float64Array;
}
function getTransform$1(device, attribute) {
	const attributeSize = attribute.size;
	const attributeType = getAttributeTypeFromSize(attributeSize);
	const inputFormat = getFloat32VertexFormat(attributeSize);
	const bufferLayout = attribute.getBufferLayout();
	if (useFp64(attribute)) return new BufferTransform(device, {
		vs: vs64,
		bufferLayout: [{
			name: "aFrom",
			byteStride: 8 * attributeSize,
			attributes: [{
				attribute: "aFrom",
				format: inputFormat,
				byteOffset: 0
			}, {
				attribute: "aFrom64Low",
				format: inputFormat,
				byteOffset: 4 * attributeSize
			}]
		}, {
			name: "aTo",
			byteStride: 8 * attributeSize,
			attributes: [{
				attribute: "aTo",
				format: inputFormat,
				byteOffset: 0
			}, {
				attribute: "aTo64Low",
				format: inputFormat,
				byteOffset: 4 * attributeSize
			}]
		}],
		modules: [fp64arithmetic, interpolationUniforms],
		defines: {
			ATTRIBUTE_TYPE: attributeType,
			ATTRIBUTE_SIZE: attributeSize
		},
		moduleSettings: {},
		varyings: ["vCurrent", "vCurrent64Low"],
		bufferMode: 35980,
		disableWarnings: true
	});
	return new BufferTransform(device, {
		vs: vs$1,
		bufferLayout: [{
			name: "aFrom",
			format: inputFormat
		}, {
			name: "aTo",
			format: bufferLayout.attributes[0].format
		}],
		modules: [interpolationUniforms],
		defines: { ATTRIBUTE_TYPE: attributeType },
		varyings: ["vCurrent"],
		disableWarnings: true
	});
}
//#endregion
//#region node_modules/@deck.gl/core/dist/transitions/gpu-spring-transition.js
var GPUSpringTransition = class extends GPUTransitionBase {
	constructor({ device, attribute, timeline }) {
		super({
			device,
			attribute,
			timeline
		});
		this.type = "spring";
		this.texture = getTexture(device);
		this.framebuffer = getFramebuffer(device, this.texture);
		this.transform = getTransform(device, attribute);
	}
	start(transitionSettings, numInstances) {
		const prevLength = this.currentLength;
		const prevStartIndices = this.currentStartIndices;
		super.start(transitionSettings, numInstances);
		const { buffers, attribute } = this;
		for (let i = 0; i < 2; i++) buffers[i] = padBuffer({
			device: this.device,
			buffer: buffers[i],
			attribute,
			fromLength: prevLength,
			toLength: this.currentLength,
			fromStartIndices: prevStartIndices,
			getData: transitionSettings.enter
		});
		buffers[2] = matchBuffer({
			device: this.device,
			source: buffers[0],
			target: buffers[2]
		});
		this.setBuffer(buffers[1]);
		const { model } = this.transform;
		model.setVertexCount(Math.floor(this.currentLength / attribute.size));
		if (attribute.isConstant) model.setConstantAttributes({ aTo: attribute.value });
		else model.setAttributes({ aTo: attribute.getBuffer() });
	}
	onUpdate() {
		const { buffers, transform, framebuffer, transition } = this;
		const settings = this.settings;
		transform.model.setAttributes({
			aPrev: buffers[0],
			aCur: buffers[1]
		});
		transform.transformFeedback.setBuffers({ vNext: buffers[2] });
		const springProps = {
			stiffness: settings.stiffness,
			damping: settings.damping
		};
		transform.model.shaderInputs.setProps({ spring: springProps });
		transform.run({
			framebuffer,
			discard: false,
			parameters: { viewport: [
				0,
				0,
				1,
				1
			] },
			clearColor: [
				0,
				0,
				0,
				0
			]
		});
		cycleBuffers(buffers);
		this.setBuffer(buffers[1]);
		if (!(this.device.readPixelsToArrayWebGL(framebuffer)[0] > 0)) transition.end();
	}
	delete() {
		super.delete();
		this.transform.destroy();
		this.texture.destroy();
		this.framebuffer.destroy();
	}
};
var springUniforms = {
	name: "spring",
	vs: `\
layout(std140) uniform springUniforms {
  float damping;
  float stiffness;
} spring;
`,
	uniformTypes: {
		damping: "f32",
		stiffness: "f32"
	}
};
var vs = `\
#version 300 es
#define SHADER_NAME spring-transition-vertex-shader

#define EPSILON 0.00001

in ATTRIBUTE_TYPE aPrev;
in ATTRIBUTE_TYPE aCur;
in ATTRIBUTE_TYPE aTo;
out ATTRIBUTE_TYPE vNext;
out float vIsTransitioningFlag;

ATTRIBUTE_TYPE getNextValue(ATTRIBUTE_TYPE cur, ATTRIBUTE_TYPE prev, ATTRIBUTE_TYPE dest) {
  ATTRIBUTE_TYPE velocity = cur - prev;
  ATTRIBUTE_TYPE delta = dest - cur;
  ATTRIBUTE_TYPE force = delta * spring.stiffness;
  ATTRIBUTE_TYPE resistance = velocity * spring.damping;
  return force - resistance + velocity + cur;
}

void main(void) {
  bool isTransitioning = length(aCur - aPrev) > EPSILON || length(aTo - aCur) > EPSILON;
  vIsTransitioningFlag = isTransitioning ? 1.0 : 0.0;

  vNext = getNextValue(aCur, aPrev, aTo);
  gl_Position = vec4(0, 0, 0, 1);
  gl_PointSize = 100.0;
}
`;
var fs = `\
#version 300 es
#define SHADER_NAME spring-transition-is-transitioning-fragment-shader

in float vIsTransitioningFlag;

out vec4 fragColor;

void main(void) {
  if (vIsTransitioningFlag == 0.0) {
    discard;
  }
  fragColor = vec4(1.0);
}`;
function getTransform(device, attribute) {
	const attributeType = getAttributeTypeFromSize(attribute.size);
	const format = getFloat32VertexFormat(attribute.size);
	return new BufferTransform(device, {
		vs,
		fs,
		bufferLayout: [
			{
				name: "aPrev",
				format
			},
			{
				name: "aCur",
				format
			},
			{
				name: "aTo",
				format: attribute.getBufferLayout().attributes[0].format
			}
		],
		varyings: ["vNext"],
		modules: [springUniforms],
		defines: { ATTRIBUTE_TYPE: attributeType },
		parameters: {
			depthCompare: "always",
			blendColorOperation: "max",
			blendColorSrcFactor: "one",
			blendColorDstFactor: "one",
			blendAlphaOperation: "max",
			blendAlphaSrcFactor: "one",
			blendAlphaDstFactor: "one"
		}
	});
}
function getTexture(device) {
	return device.createTexture({
		data: new Uint8Array(4),
		format: "rgba8unorm",
		width: 1,
		height: 1
	});
}
function getFramebuffer(device, texture) {
	return device.createFramebuffer({
		id: "spring-transition-is-transitioning-framebuffer",
		width: 1,
		height: 1,
		colorAttachments: [texture]
	});
}
//#endregion
//#region node_modules/@deck.gl/core/dist/lib/attribute/attribute-transition-manager.js
var TRANSITION_TYPES$1 = {
	interpolation: GPUInterpolationTransition,
	spring: GPUSpringTransition
};
var AttributeTransitionManager = class {
	constructor(device, { id, timeline }) {
		if (!device) throw new Error("AttributeTransitionManager is constructed without device");
		this.id = id;
		this.device = device;
		this.timeline = timeline;
		this.transitions = {};
		this.needsRedraw = false;
		this.numInstances = 1;
	}
	finalize() {
		for (const attributeName in this.transitions) this._removeTransition(attributeName);
	}
	update({ attributes, transitions, numInstances }) {
		this.numInstances = numInstances || 1;
		for (const attributeName in attributes) {
			const attribute = attributes[attributeName];
			const settings = attribute.getTransitionSetting(transitions);
			if (!settings) continue;
			this._updateAttribute(attributeName, attribute, settings);
		}
		for (const attributeName in this.transitions) {
			const attribute = attributes[attributeName];
			if (!attribute || !attribute.getTransitionSetting(transitions)) this._removeTransition(attributeName);
		}
	}
	hasAttribute(attributeName) {
		const transition = this.transitions[attributeName];
		return transition && transition.inProgress;
	}
	getAttributes() {
		const animatedAttributes = {};
		for (const attributeName in this.transitions) {
			const transition = this.transitions[attributeName];
			if (transition.inProgress) animatedAttributes[attributeName] = transition.attributeInTransition;
		}
		return animatedAttributes;
	}
	run() {
		if (this.numInstances === 0) return false;
		for (const attributeName in this.transitions) if (this.transitions[attributeName].update()) this.needsRedraw = true;
		const needsRedraw = this.needsRedraw;
		this.needsRedraw = false;
		return needsRedraw;
	}
	_removeTransition(attributeName) {
		this.transitions[attributeName].delete();
		delete this.transitions[attributeName];
	}
	_updateAttribute(attributeName, attribute, settings) {
		const transition = this.transitions[attributeName];
		let isNew = !transition || transition.type !== settings.type;
		if (isNew) {
			if (transition) this._removeTransition(attributeName);
			const TransitionType = TRANSITION_TYPES$1[settings.type];
			if (TransitionType) this.transitions[attributeName] = new TransitionType({
				attribute,
				timeline: this.timeline,
				device: this.device
			});
			else {
				defaultLogger.error(`unsupported transition type '${settings.type}'`)();
				isNew = false;
			}
		}
		if (isNew || attribute.needsRedraw()) {
			this.needsRedraw = true;
			this.transitions[attributeName].start(settings, this.numInstances);
		}
	}
};
//#endregion
//#region node_modules/@deck.gl/core/dist/lib/attribute/attribute-manager.js
var TRACE_INVALIDATE = "attributeManager.invalidate";
var TRACE_UPDATE_START = "attributeManager.updateStart";
var TRACE_UPDATE_END = "attributeManager.updateEnd";
var TRACE_ATTRIBUTE_UPDATE_START = "attribute.updateStart";
var TRACE_ATTRIBUTE_ALLOCATE = "attribute.allocate";
var TRACE_ATTRIBUTE_UPDATE_END = "attribute.updateEnd";
var AttributeManager = class {
	constructor(device, { id = "attribute-manager", stats, timeline } = {}) {
		this.mergeBoundsMemoized = memoize(mergeBounds);
		this.id = id;
		this.device = device;
		this.attributes = {};
		this.updateTriggers = {};
		this.needsRedraw = true;
		this.userData = {};
		this.stats = stats;
		this.attributeTransitionManager = new AttributeTransitionManager(device, {
			id: `${id}-transitions`,
			timeline
		});
		Object.seal(this);
	}
	finalize() {
		for (const attributeName in this.attributes) this.attributes[attributeName].delete();
		this.attributeTransitionManager.finalize();
	}
	getNeedsRedraw(opts = { clearRedrawFlags: false }) {
		const redraw = this.needsRedraw;
		this.needsRedraw = this.needsRedraw && !opts.clearRedrawFlags;
		return redraw && this.id;
	}
	setNeedsRedraw() {
		this.needsRedraw = true;
	}
	add(attributes) {
		this._add(attributes);
	}
	addInstanced(attributes) {
		this._add(attributes, { stepMode: "instance" });
	}
	/**
	* Removes attributes
	* Takes an array of attribute names and delete them from
	* the attribute map if they exists
	*
	* @example
	* attributeManager.remove(['position']);
	*
	* @param {Object} attributeNameArray - attribute name array (see above)
	*/
	remove(attributeNameArray) {
		for (const name of attributeNameArray) if (this.attributes[name] !== void 0) {
			this.attributes[name].delete();
			delete this.attributes[name];
		}
	}
	invalidate(triggerName, dataRange) {
		const invalidatedAttributes = this._invalidateTrigger(triggerName, dataRange);
		debug(TRACE_INVALIDATE, this, triggerName, invalidatedAttributes);
	}
	invalidateAll(dataRange) {
		for (const attributeName in this.attributes) this.attributes[attributeName].setNeedsUpdate(attributeName, dataRange);
		debug(TRACE_INVALIDATE, this, "all");
	}
	update({ data, numInstances, startIndices = null, transitions, props = {}, buffers = {}, context = {} }) {
		let updated = false;
		debug(TRACE_UPDATE_START, this);
		if (this.stats) this.stats.get("Update Attributes").timeStart();
		for (const attributeName in this.attributes) {
			const attribute = this.attributes[attributeName];
			const accessorName = attribute.settings.accessor;
			attribute.startIndices = startIndices;
			attribute.numInstances = numInstances;
			if (props[attributeName]) defaultLogger.removed(`props.${attributeName}`, `data.attributes.${attributeName}`)();
			if (attribute.setExternalBuffer(buffers[attributeName])) {} else if (attribute.setBinaryValue(typeof accessorName === "string" ? buffers[accessorName] : void 0, data.startIndices)) {} else if (typeof accessorName === "string" && !buffers[accessorName] && attribute.setConstantValue(context, props[accessorName])) {} else if (attribute.needsUpdate()) {
				updated = true;
				this._updateAttribute({
					attribute,
					numInstances,
					data,
					props,
					context
				});
			}
			this.needsRedraw = this.needsRedraw || attribute.needsRedraw();
		}
		if (updated) debug(TRACE_UPDATE_END, this, numInstances);
		if (this.stats) {
			this.stats.get("Update Attributes").timeEnd();
			if (updated) this.stats.get("Attributes updated").incrementCount();
		}
		this.attributeTransitionManager.update({
			attributes: this.attributes,
			numInstances,
			transitions
		});
	}
	updateTransition() {
		const { attributeTransitionManager } = this;
		const transitionUpdated = attributeTransitionManager.run();
		this.needsRedraw = this.needsRedraw || transitionUpdated;
		return transitionUpdated;
	}
	/**
	* Returns all attribute descriptors
	* Note: Format matches luma.gl Model/Program.setAttributes()
	* @return {Object} attributes - descriptors
	*/
	getAttributes() {
		return {
			...this.attributes,
			...this.attributeTransitionManager.getAttributes()
		};
	}
	/**
	* Computes the spatial bounds of a given set of attributes
	*/
	getBounds(attributeNames) {
		const bounds = attributeNames.map((attributeName) => this.attributes[attributeName]?.getBounds());
		return this.mergeBoundsMemoized(bounds);
	}
	/**
	* Returns changed attribute descriptors
	* This indicates which WebGLBuffers need to be updated
	* @return {Object} attributes - descriptors
	*/
	getChangedAttributes(opts = { clearChangedFlags: false }) {
		const { attributes, attributeTransitionManager } = this;
		const changedAttributes = { ...attributeTransitionManager.getAttributes() };
		for (const attributeName in attributes) {
			const attribute = attributes[attributeName];
			if (attribute.needsRedraw(opts) && !attributeTransitionManager.hasAttribute(attributeName)) changedAttributes[attributeName] = attribute;
		}
		return changedAttributes;
	}
	/** Generate WebGPU-style buffer layout descriptors from all attributes */
	getBufferLayouts(modelInfo) {
		return Object.values(this.getAttributes()).map((attribute) => attribute.getBufferLayout(modelInfo));
	}
	/** Register new attributes */
	_add(attributes, overrideOptions) {
		for (const attributeName in attributes) {
			const attribute = attributes[attributeName];
			const props = {
				...attribute,
				id: attributeName,
				size: attribute.isIndexed && 1 || attribute.size || 1,
				...overrideOptions
			};
			this.attributes[attributeName] = new Attribute(this.device, props);
		}
		this._mapUpdateTriggersToAttributes();
	}
	_mapUpdateTriggersToAttributes() {
		const triggers = {};
		for (const attributeName in this.attributes) this.attributes[attributeName].getUpdateTriggers().forEach((triggerName) => {
			if (!triggers[triggerName]) triggers[triggerName] = [];
			triggers[triggerName].push(attributeName);
		});
		this.updateTriggers = triggers;
	}
	_invalidateTrigger(triggerName, dataRange) {
		const { attributes, updateTriggers } = this;
		const invalidatedAttributes = updateTriggers[triggerName];
		if (invalidatedAttributes) invalidatedAttributes.forEach((name) => {
			const attribute = attributes[name];
			if (attribute) attribute.setNeedsUpdate(attribute.id, dataRange);
		});
		return invalidatedAttributes;
	}
	_updateAttribute(opts) {
		const { attribute, numInstances } = opts;
		debug(TRACE_ATTRIBUTE_UPDATE_START, attribute);
		if (attribute.constant) {
			attribute.setConstantValue(opts.context, attribute.value);
			return;
		}
		if (attribute.allocate(numInstances)) debug(TRACE_ATTRIBUTE_ALLOCATE, attribute, numInstances);
		if (attribute.updateBuffer(opts)) {
			this.needsRedraw = true;
			debug(TRACE_ATTRIBUTE_UPDATE_END, attribute, numInstances);
		}
	}
};
//#endregion
//#region node_modules/@deck.gl/core/dist/transitions/cpu-interpolation-transition.js
var CPUInterpolationTransition = class extends Transition {
	get value() {
		return this._value;
	}
	_onUpdate() {
		const { time, settings: { fromValue, toValue, duration, easing } } = this;
		const t = easing(time / duration);
		this._value = lerp(fromValue, toValue, t);
	}
};
//#endregion
//#region node_modules/@deck.gl/core/dist/transitions/cpu-spring-transition.js
var EPSILON = 1e-5;
function updateSpringElement(prev, cur, dest, damping, stiffness) {
	const velocity = cur - prev;
	return (dest - cur) * stiffness + -velocity * damping + velocity + cur;
}
function updateSpring(prev, cur, dest, damping, stiffness) {
	if (Array.isArray(dest)) {
		const next = [];
		for (let i = 0; i < dest.length; i++) next[i] = updateSpringElement(prev[i], cur[i], dest[i], damping, stiffness);
		return next;
	}
	return updateSpringElement(prev, cur, dest, damping, stiffness);
}
function distance(value1, value2) {
	if (Array.isArray(value1)) {
		let distanceSquare = 0;
		for (let i = 0; i < value1.length; i++) {
			const d = value1[i] - value2[i];
			distanceSquare += d * d;
		}
		return Math.sqrt(distanceSquare);
	}
	return Math.abs(value1 - value2);
}
var CPUSpringTransition = class extends Transition {
	get value() {
		return this._currValue;
	}
	_onUpdate() {
		const { fromValue, toValue, damping, stiffness } = this.settings;
		const { _prevValue = fromValue, _currValue = fromValue } = this;
		let nextValue = updateSpring(_prevValue, _currValue, toValue, damping, stiffness);
		const delta = distance(nextValue, toValue);
		const velocity = distance(nextValue, _currValue);
		if (delta < EPSILON && velocity < EPSILON) {
			nextValue = toValue;
			this.end();
		}
		this._prevValue = _currValue;
		this._currValue = nextValue;
	}
};
//#endregion
//#region node_modules/@deck.gl/core/dist/lib/uniform-transition-manager.js
var TRANSITION_TYPES = {
	interpolation: CPUInterpolationTransition,
	spring: CPUSpringTransition
};
var UniformTransitionManager = class {
	constructor(timeline) {
		this.transitions = /* @__PURE__ */ new Map();
		this.timeline = timeline;
	}
	get active() {
		return this.transitions.size > 0;
	}
	add(key, fromValue, toValue, settings) {
		const { transitions } = this;
		if (transitions.has(key)) {
			const transition = transitions.get(key);
			const { value = transition.settings.fromValue } = transition;
			fromValue = value;
			this.remove(key);
		}
		settings = normalizeTransitionSettings(settings);
		if (!settings) return;
		const TransitionType = TRANSITION_TYPES[settings.type];
		if (!TransitionType) {
			defaultLogger.error(`unsupported transition type '${settings.type}'`)();
			return;
		}
		const transition = new TransitionType(this.timeline);
		transition.start({
			...settings,
			fromValue,
			toValue
		});
		transitions.set(key, transition);
	}
	remove(key) {
		const { transitions } = this;
		if (transitions.has(key)) {
			transitions.get(key).cancel();
			transitions.delete(key);
		}
	}
	update() {
		const propsInTransition = {};
		for (const [key, transition] of this.transitions) {
			transition.update();
			propsInTransition[key] = transition.value;
			if (!transition.inProgress) this.remove(key);
		}
		return propsInTransition;
	}
	clear() {
		for (const key of this.transitions.keys()) this.remove(key);
	}
};
//#endregion
//#region node_modules/@deck.gl/core/dist/lifecycle/props.js
function validateProps(props) {
	const propTypes = props[PROP_TYPES_SYMBOL];
	for (const propName in propTypes) {
		const propType = propTypes[propName];
		const { validate } = propType;
		if (validate && !validate(props[propName], propType)) throw new Error(`Invalid prop ${propName}: ${props[propName]}`);
	}
}
function diffProps(props, oldProps) {
	const propsChangedReason = compareProps({
		newProps: props,
		oldProps,
		propTypes: props[PROP_TYPES_SYMBOL],
		ignoreProps: {
			data: null,
			updateTriggers: null,
			extensions: null,
			transitions: null
		}
	});
	const dataChangedReason = diffDataProps(props, oldProps);
	let updateTriggersChangedReason = false;
	if (!dataChangedReason) updateTriggersChangedReason = diffUpdateTriggers(props, oldProps);
	return {
		dataChanged: dataChangedReason,
		propsChanged: propsChangedReason,
		updateTriggersChanged: updateTriggersChangedReason,
		extensionsChanged: diffExtensions(props, oldProps),
		transitionsChanged: diffTransitions(props, oldProps)
	};
}
function diffTransitions(props, oldProps) {
	if (!props.transitions) return false;
	const result = {};
	const propTypes = props[PROP_TYPES_SYMBOL];
	let changed = false;
	for (const key in props.transitions) {
		const propType = propTypes[key];
		const type = propType && propType.type;
		if ((type === "number" || type === "color" || type === "array") && comparePropValues(props[key], oldProps[key], propType)) {
			result[key] = true;
			changed = true;
		}
	}
	return changed ? result : false;
}
/**
* Performs equality by iterating through keys on an object and returning false
* when any key has values which are not strictly equal between the arguments.
* @param {Object} opt.oldProps - object with old key/value pairs
* @param {Object} opt.newProps - object with new key/value pairs
* @param {Object} opt.ignoreProps={} - object, keys that should not be compared
* @returns {null|String} - null when values of all keys are strictly equal.
*   if unequal, returns a string explaining what changed.
*/
function compareProps({ newProps, oldProps, ignoreProps = {}, propTypes = {}, triggerName = "props" }) {
	if (oldProps === newProps) return false;
	if (typeof newProps !== "object" || newProps === null) return `${triggerName} changed shallowly`;
	if (typeof oldProps !== "object" || oldProps === null) return `${triggerName} changed shallowly`;
	for (const key of Object.keys(newProps)) if (!(key in ignoreProps)) {
		if (!(key in oldProps)) return `${triggerName}.${key} added`;
		const changed = comparePropValues(newProps[key], oldProps[key], propTypes[key]);
		if (changed) return `${triggerName}.${key} ${changed}`;
	}
	for (const key of Object.keys(oldProps)) if (!(key in ignoreProps)) {
		if (!(key in newProps)) return `${triggerName}.${key} dropped`;
		if (!Object.hasOwnProperty.call(newProps, key)) {
			const changed = comparePropValues(newProps[key], oldProps[key], propTypes[key]);
			if (changed) return `${triggerName}.${key} ${changed}`;
		}
	}
	return false;
}
function comparePropValues(newProp, oldProp, propType) {
	let equal = propType && propType.equal;
	if (equal && !equal(newProp, oldProp, propType)) return "changed deeply";
	if (!equal) {
		equal = newProp && oldProp && newProp.equals;
		if (equal && !equal.call(newProp, oldProp)) return "changed deeply";
	}
	if (!equal && oldProp !== newProp) return "changed shallowly";
	return null;
}
function diffDataProps(props, oldProps) {
	if (oldProps === null) return "oldProps is null, initial diff";
	let dataChanged = false;
	const { dataComparator, _dataDiff } = props;
	if (dataComparator) {
		if (!dataComparator(props.data, oldProps.data)) dataChanged = "Data comparator detected a change";
	} else if (props.data !== oldProps.data) dataChanged = "A new data container was supplied";
	if (dataChanged && _dataDiff) dataChanged = _dataDiff(props.data, oldProps.data) || dataChanged;
	return dataChanged;
}
function diffUpdateTriggers(props, oldProps) {
	if (oldProps === null) return { all: true };
	if ("all" in props.updateTriggers) {
		if (diffUpdateTrigger(props, oldProps, "all")) return { all: true };
	}
	const reason = {};
	let changed = false;
	for (const triggerName in props.updateTriggers) if (triggerName !== "all") {
		if (diffUpdateTrigger(props, oldProps, triggerName)) {
			reason[triggerName] = true;
			changed = true;
		}
	}
	return changed ? reason : false;
}
function diffExtensions(props, oldProps) {
	if (oldProps === null) return true;
	const oldExtensions = oldProps.extensions;
	const { extensions } = props;
	if (extensions === oldExtensions) return false;
	if (!oldExtensions || !extensions) return true;
	if (extensions.length !== oldExtensions.length) return true;
	for (let i = 0; i < extensions.length; i++) if (!extensions[i].equals(oldExtensions[i])) return true;
	return false;
}
function diffUpdateTrigger(props, oldProps, triggerName) {
	let newTriggers = props.updateTriggers[triggerName];
	newTriggers = newTriggers === void 0 || newTriggers === null ? {} : newTriggers;
	let oldTriggers = oldProps.updateTriggers[triggerName];
	oldTriggers = oldTriggers === void 0 || oldTriggers === null ? {} : oldTriggers;
	return compareProps({
		oldProps: oldTriggers,
		newProps: newTriggers,
		triggerName
	});
}
//#endregion
//#region node_modules/@deck.gl/core/dist/utils/count.js
var ERR_NOT_OBJECT = "count(): argument not an object";
var ERR_NOT_CONTAINER = "count(): argument not a container";
/**
* Deduces numer of elements in a JavaScript container.
* - Auto-deduction for ES6 containers that define a count() method
* - Auto-deduction for ES6 containers that define a size member
* - Auto-deduction for Classic Arrays via the built-in length attribute
* - Also handles objects, although note that this an O(N) operation
*/
function count(container) {
	if (!isObject(container)) throw new Error(ERR_NOT_OBJECT);
	if (typeof container.count === "function") return container.count();
	if (Number.isFinite(container.size)) return container.size;
	if (Number.isFinite(container.length)) return container.length;
	if (isPlainObject(container)) return Object.keys(container).length;
	throw new Error(ERR_NOT_CONTAINER);
}
/**
* Checks if argument is a plain object (not a class or array etc)
* @param {*} value - JavaScript value to be tested
* @return {Boolean} - true if argument is a plain JavaScript object
*/
function isPlainObject(value) {
	return value !== null && typeof value === "object" && value.constructor === Object;
}
/**
* Checks if argument is an indexable object (not a primitive value, nor null)
* @param {*} value - JavaScript value to be tested
* @return {Boolean} - true if argument is a JavaScript object
*/
function isObject(value) {
	return value !== null && typeof value === "object";
}
//#endregion
//#region node_modules/@deck.gl/core/dist/utils/texture.js
var DEFAULT_TEXTURE_PARAMETERS = {
	minFilter: "linear",
	mipmapFilter: "linear",
	magFilter: "linear",
	addressModeU: "clamp-to-edge",
	addressModeV: "clamp-to-edge"
};
var internalTextures = {};
/**
*
* @param owner
* @param device
* @param image could be one of:
*   - Texture
*   - Browser object: Image, ImageData, ImageData, HTMLCanvasElement, HTMLVideoElement, ImageBitmap
*   - Plain object: {width: <number>, height: <number>, data: <Uint8Array>}
* @param parameters
* @returns
*/
function createTexture(owner, device, image, sampler) {
	if (image instanceof Texture) return image;
	else if (image.constructor && image.constructor.name !== "Object") image = { data: image };
	let samplerParameters = null;
	if (image.compressed) samplerParameters = {
		minFilter: "linear",
		mipmapFilter: image.data.length > 1 ? "nearest" : "linear"
	};
	const { width, height } = image.data;
	const texture = device.createTexture({
		...image,
		sampler: {
			...DEFAULT_TEXTURE_PARAMETERS,
			...samplerParameters,
			...sampler
		},
		mipLevels: device.getMipLevelCount(width, height)
	});
	if (device.type === "webgl") texture.generateMipmapsWebGL();
	else if (device.type === "webgpu") device.generateMipmapsWebGPU(texture);
	internalTextures[texture.id] = owner;
	return texture;
}
function destroyTexture(owner, texture) {
	if (!texture || !(texture instanceof Texture)) return;
	if (internalTextures[texture.id] === owner) {
		texture.delete();
		delete internalTextures[texture.id];
	}
}
//#endregion
//#region node_modules/@deck.gl/core/dist/lifecycle/prop-types.js
var TYPE_DEFINITIONS = {
	boolean: {
		validate(value, propType) {
			return true;
		},
		equal(value1, value2, propType) {
			return Boolean(value1) === Boolean(value2);
		}
	},
	number: { validate(value, propType) {
		return Number.isFinite(value) && (!("max" in propType) || value <= propType.max) && (!("min" in propType) || value >= propType.min);
	} },
	color: {
		validate(value, propType) {
			return propType.optional && !value || isArray(value) && (value.length === 3 || value.length === 4);
		},
		equal(value1, value2, propType) {
			return deepEqual(value1, value2, 1);
		}
	},
	accessor: {
		validate(value, propType) {
			const valueType = getTypeOf(value);
			return valueType === "function" || valueType === getTypeOf(propType.value);
		},
		equal(value1, value2, propType) {
			if (typeof value2 === "function") return true;
			return deepEqual(value1, value2, 1);
		}
	},
	array: {
		validate(value, propType) {
			return propType.optional && !value || isArray(value);
		},
		equal(value1, value2, propType) {
			const { compare } = propType;
			return compare ? deepEqual(value1, value2, Number.isInteger(compare) ? compare : compare ? 1 : 0) : value1 === value2;
		}
	},
	object: { equal(value1, value2, propType) {
		if (propType.ignore) return true;
		const { compare } = propType;
		return compare ? deepEqual(value1, value2, Number.isInteger(compare) ? compare : compare ? 1 : 0) : value1 === value2;
	} },
	function: {
		validate(value, propType) {
			return propType.optional && !value || typeof value === "function";
		},
		equal(value1, value2, propType) {
			return !propType.compare && propType.ignore !== false || value1 === value2;
		}
	},
	data: { transform: (value, propType, component) => {
		if (!value) return value;
		const { dataTransform } = component.props;
		if (dataTransform) return dataTransform(value);
		if (typeof value.shape === "string" && value.shape.endsWith("-table") && Array.isArray(value.data)) return value.data;
		return value;
	} },
	image: {
		transform: (value, propType, component) => {
			const context = component.context;
			if (!context || !context.device) return null;
			return createTexture(component.id, context.device, value, {
				...propType.parameters,
				...component.props.textureParameters
			});
		},
		release: (value, propType, component) => {
			destroyTexture(component.id, value);
		}
	}
};
function parsePropTypes(propDefs) {
	const propTypes = {};
	const defaultProps = {};
	const deprecatedProps = {};
	for (const [propName, propDef] of Object.entries(propDefs)) {
		const deprecated = propDef?.deprecatedFor;
		if (deprecated) deprecatedProps[propName] = Array.isArray(deprecated) ? deprecated : [deprecated];
		else {
			const propType = parsePropType(propName, propDef);
			propTypes[propName] = propType;
			defaultProps[propName] = propType.value;
		}
	}
	return {
		propTypes,
		defaultProps,
		deprecatedProps
	};
}
function parsePropType(name, propDef) {
	switch (getTypeOf(propDef)) {
		case "object": return normalizePropDefinition(name, propDef);
		case "array": return normalizePropDefinition(name, {
			type: "array",
			value: propDef,
			compare: false
		});
		case "boolean": return normalizePropDefinition(name, {
			type: "boolean",
			value: propDef
		});
		case "number": return normalizePropDefinition(name, {
			type: "number",
			value: propDef
		});
		case "function": return normalizePropDefinition(name, {
			type: "function",
			value: propDef,
			compare: true
		});
		default: return {
			name,
			type: "unknown",
			value: propDef
		};
	}
}
function normalizePropDefinition(name, propDef) {
	if (!("type" in propDef)) {
		if (!("value" in propDef)) return {
			name,
			type: "object",
			value: propDef
		};
		return {
			name,
			type: getTypeOf(propDef.value),
			...propDef
		};
	}
	return {
		name,
		...TYPE_DEFINITIONS[propDef.type],
		...propDef
	};
}
function isArray(value) {
	return Array.isArray(value) || ArrayBuffer.isView(value);
}
function getTypeOf(value) {
	if (isArray(value)) return "array";
	if (value === null) return "null";
	return typeof value;
}
//#endregion
//#region node_modules/@deck.gl/core/dist/lifecycle/create-props.js
function createProps(component, propObjects) {
	let extensions;
	for (let i = propObjects.length - 1; i >= 0; i--) {
		const props = propObjects[i];
		if ("extensions" in props) extensions = props.extensions;
	}
	const propsPrototype = getPropsPrototype(component.constructor, extensions);
	const propsInstance = Object.create(propsPrototype);
	propsInstance[COMPONENT_SYMBOL] = component;
	propsInstance[ASYNC_ORIGINAL_SYMBOL] = {};
	propsInstance[ASYNC_RESOLVED_SYMBOL] = {};
	for (let i = 0; i < propObjects.length; ++i) {
		const props = propObjects[i];
		for (const key in props) propsInstance[key] = props[key];
	}
	Object.freeze(propsInstance);
	return propsInstance;
}
var MergedDefaultPropsCacheKey = "_mergedDefaultProps";
function getPropsPrototype(componentClass, extensions) {
	if (!(componentClass instanceof Component.constructor)) return {};
	let cacheKey = MergedDefaultPropsCacheKey;
	if (extensions) for (const extension of extensions) {
		const ExtensionClass = extension.constructor;
		if (ExtensionClass) cacheKey += `:${ExtensionClass.extensionName || ExtensionClass.name}`;
	}
	const defaultProps = getOwnProperty(componentClass, cacheKey);
	if (!defaultProps) return componentClass[cacheKey] = createPropsPrototypeAndTypes(componentClass, extensions || []);
	return defaultProps;
}
function createPropsPrototypeAndTypes(componentClass, extensions) {
	if (!componentClass.prototype) return null;
	const parentDefaultProps = getPropsPrototype(Object.getPrototypeOf(componentClass));
	const componentPropDefs = parsePropTypes(getOwnProperty(componentClass, "defaultProps") || {});
	const defaultProps = Object.assign(Object.create(null), parentDefaultProps, componentPropDefs.defaultProps);
	const propTypes = Object.assign(Object.create(null), parentDefaultProps?.[PROP_TYPES_SYMBOL], componentPropDefs.propTypes);
	const deprecatedProps = Object.assign(Object.create(null), parentDefaultProps?.[DEPRECATED_PROPS_SYMBOL], componentPropDefs.deprecatedProps);
	for (const extension of extensions) {
		const extensionDefaultProps = getPropsPrototype(extension.constructor);
		if (extensionDefaultProps) {
			Object.assign(defaultProps, extensionDefaultProps);
			Object.assign(propTypes, extensionDefaultProps[PROP_TYPES_SYMBOL]);
			Object.assign(deprecatedProps, extensionDefaultProps[DEPRECATED_PROPS_SYMBOL]);
		}
	}
	createPropsPrototype(defaultProps, componentClass);
	addAsyncPropsToPropPrototype(defaultProps, propTypes);
	addDeprecatedPropsToPropPrototype(defaultProps, deprecatedProps);
	defaultProps[PROP_TYPES_SYMBOL] = propTypes;
	defaultProps[DEPRECATED_PROPS_SYMBOL] = deprecatedProps;
	if (extensions.length === 0 && !hasOwnProperty(componentClass, "_propTypes")) componentClass._propTypes = propTypes;
	return defaultProps;
}
function createPropsPrototype(defaultProps, componentClass) {
	const id = getComponentName(componentClass);
	Object.defineProperties(defaultProps, { id: {
		writable: true,
		value: id
	} });
}
function addDeprecatedPropsToPropPrototype(defaultProps, deprecatedProps) {
	for (const propName in deprecatedProps) Object.defineProperty(defaultProps, propName, {
		enumerable: false,
		set(newValue) {
			const nameStr = `${this.id}: ${propName}`;
			for (const newPropName of deprecatedProps[propName]) if (!hasOwnProperty(this, newPropName)) this[newPropName] = newValue;
			defaultLogger.deprecated(nameStr, deprecatedProps[propName].join("/"))();
		}
	});
}
function addAsyncPropsToPropPrototype(defaultProps, propTypes) {
	const defaultValues = {};
	const descriptors = {};
	for (const propName in propTypes) {
		const propType = propTypes[propName];
		const { name, value } = propType;
		if (propType.async) {
			defaultValues[name] = value;
			descriptors[name] = getDescriptorForAsyncProp(name);
		}
	}
	defaultProps[ASYNC_DEFAULTS_SYMBOL] = defaultValues;
	defaultProps[ASYNC_ORIGINAL_SYMBOL] = {};
	Object.defineProperties(defaultProps, descriptors);
}
function getDescriptorForAsyncProp(name) {
	return {
		enumerable: true,
		set(newValue) {
			if (typeof newValue === "string" || newValue instanceof Promise || isAsyncIterable(newValue)) this[ASYNC_ORIGINAL_SYMBOL][name] = newValue;
			else this[ASYNC_RESOLVED_SYMBOL][name] = newValue;
		},
		get() {
			if (this[ASYNC_RESOLVED_SYMBOL]) {
				if (name in this[ASYNC_RESOLVED_SYMBOL]) return this[ASYNC_RESOLVED_SYMBOL][name] || this[ASYNC_DEFAULTS_SYMBOL][name];
				if (name in this[ASYNC_ORIGINAL_SYMBOL]) {
					const state = this[COMPONENT_SYMBOL] && this[COMPONENT_SYMBOL].internalState;
					if (state && state.hasAsyncProp(name)) return state.getAsyncProp(name) || this[ASYNC_DEFAULTS_SYMBOL][name];
				}
			}
			return this[ASYNC_DEFAULTS_SYMBOL][name];
		}
	};
}
function hasOwnProperty(object, prop) {
	return Object.prototype.hasOwnProperty.call(object, prop);
}
function getOwnProperty(object, prop) {
	return hasOwnProperty(object, prop) && object[prop];
}
function getComponentName(componentClass) {
	const componentName = componentClass.componentName;
	if (!componentName) defaultLogger.warn(`${componentClass.name}.componentName not specified`)();
	return componentName || componentClass.name;
}
//#endregion
//#region node_modules/@deck.gl/core/dist/lifecycle/component.js
var counter = 0;
var Component = class {
	constructor(...propObjects) {
		this.props = createProps(this, propObjects);
		this.id = this.props.id;
		this.count = counter++;
	}
	clone(newProps) {
		const { props } = this;
		const asyncProps = {};
		for (const key in props[ASYNC_DEFAULTS_SYMBOL]) if (key in props[ASYNC_RESOLVED_SYMBOL]) asyncProps[key] = props[ASYNC_RESOLVED_SYMBOL][key];
		else if (key in props[ASYNC_ORIGINAL_SYMBOL]) asyncProps[key] = props[ASYNC_ORIGINAL_SYMBOL][key];
		return new this.constructor({
			...props,
			...asyncProps,
			...newProps
		});
	}
};
Component.componentName = "Component";
Component.defaultProps = {};
//#endregion
//#region node_modules/@deck.gl/core/dist/lifecycle/component-state.js
var EMPTY_PROPS = Object.freeze({});
var ComponentState = class {
	constructor(component) {
		this.component = component;
		this.asyncProps = {};
		this.onAsyncPropUpdated = () => {};
		this.oldProps = null;
		this.oldAsyncProps = null;
	}
	finalize() {
		for (const propName in this.asyncProps) {
			const asyncProp = this.asyncProps[propName];
			if (asyncProp && asyncProp.type && asyncProp.type.release) asyncProp.type.release(asyncProp.resolvedValue, asyncProp.type, this.component);
		}
		this.asyncProps = {};
		this.component = null;
		this.resetOldProps();
	}
	getOldProps() {
		return this.oldAsyncProps || this.oldProps || EMPTY_PROPS;
	}
	resetOldProps() {
		this.oldAsyncProps = null;
		this.oldProps = this.component ? this.component.props : null;
	}
	hasAsyncProp(propName) {
		return propName in this.asyncProps;
	}
	getAsyncProp(propName) {
		const asyncProp = this.asyncProps[propName];
		return asyncProp && asyncProp.resolvedValue;
	}
	isAsyncPropLoading(propName) {
		if (propName) {
			const asyncProp = this.asyncProps[propName];
			return Boolean(asyncProp && asyncProp.pendingLoadCount > 0 && asyncProp.pendingLoadCount !== asyncProp.resolvedLoadCount);
		}
		for (const key in this.asyncProps) if (this.isAsyncPropLoading(key)) return true;
		return false;
	}
	reloadAsyncProp(propName, value) {
		this._watchPromise(propName, Promise.resolve(value));
	}
	setAsyncProps(props) {
		this.component = props[COMPONENT_SYMBOL] || this.component;
		const resolvedValues = props[ASYNC_RESOLVED_SYMBOL] || {};
		const originalValues = props[ASYNC_ORIGINAL_SYMBOL] || props;
		const defaultValues = props[ASYNC_DEFAULTS_SYMBOL] || {};
		for (const propName in resolvedValues) {
			const value = resolvedValues[propName];
			this._createAsyncPropData(propName, defaultValues[propName]);
			this._updateAsyncProp(propName, value);
			resolvedValues[propName] = this.getAsyncProp(propName);
		}
		for (const propName in originalValues) {
			const value = originalValues[propName];
			this._createAsyncPropData(propName, defaultValues[propName]);
			this._updateAsyncProp(propName, value);
		}
	}
	_fetch(propName, url) {
		return null;
	}
	_onResolve(propName, value) {}
	_onError(propName, error) {}
	_updateAsyncProp(propName, value) {
		if (!this._didAsyncInputValueChange(propName, value)) return;
		if (typeof value === "string") value = this._fetch(propName, value);
		if (value instanceof Promise) {
			this._watchPromise(propName, value);
			return;
		}
		if (isAsyncIterable(value)) {
			this._resolveAsyncIterable(propName, value);
			return;
		}
		this._setPropValue(propName, value);
	}
	_freezeAsyncOldProps() {
		if (!this.oldAsyncProps && this.oldProps) {
			this.oldAsyncProps = Object.create(this.oldProps);
			for (const propName in this.asyncProps) Object.defineProperty(this.oldAsyncProps, propName, {
				enumerable: true,
				value: this.oldProps[propName]
			});
		}
	}
	_didAsyncInputValueChange(propName, value) {
		const asyncProp = this.asyncProps[propName];
		if (value === asyncProp.resolvedValue || value === asyncProp.lastValue) return false;
		asyncProp.lastValue = value;
		return true;
	}
	_setPropValue(propName, value) {
		this._freezeAsyncOldProps();
		const asyncProp = this.asyncProps[propName];
		if (asyncProp) {
			value = this._postProcessValue(asyncProp, value);
			asyncProp.resolvedValue = value;
			asyncProp.pendingLoadCount++;
			asyncProp.resolvedLoadCount = asyncProp.pendingLoadCount;
		}
	}
	_setAsyncPropValue(propName, value, loadCount) {
		const asyncProp = this.asyncProps[propName];
		if (asyncProp && loadCount >= asyncProp.resolvedLoadCount && value !== void 0) {
			this._freezeAsyncOldProps();
			asyncProp.resolvedValue = value;
			asyncProp.resolvedLoadCount = loadCount;
			this.onAsyncPropUpdated(propName, value);
		}
	}
	_watchPromise(propName, promise) {
		const asyncProp = this.asyncProps[propName];
		if (asyncProp) {
			asyncProp.pendingLoadCount++;
			const loadCount = asyncProp.pendingLoadCount;
			promise.then((data) => {
				if (!this.component) return;
				data = this._postProcessValue(asyncProp, data);
				this._setAsyncPropValue(propName, data, loadCount);
				this._onResolve(propName, data);
			}).catch((error) => {
				this._onError(propName, error);
			});
		}
	}
	async _resolveAsyncIterable(propName, iterable) {
		if (propName !== "data") {
			this._setPropValue(propName, iterable);
			return;
		}
		const asyncProp = this.asyncProps[propName];
		if (!asyncProp) return;
		asyncProp.pendingLoadCount++;
		const loadCount = asyncProp.pendingLoadCount;
		let data = [];
		let count = 0;
		for await (const chunk of iterable) {
			if (!this.component) return;
			const { dataTransform } = this.component.props;
			if (dataTransform) data = dataTransform(chunk, data);
			else data = data.concat(chunk);
			Object.defineProperty(data, "__diff", {
				enumerable: false,
				value: [{
					startRow: count,
					endRow: data.length
				}]
			});
			count = data.length;
			this._setAsyncPropValue(propName, data, loadCount);
		}
		this._onResolve(propName, data);
	}
	_postProcessValue(asyncProp, value) {
		const propType = asyncProp.type;
		if (propType && this.component) {
			if (propType.release) propType.release(asyncProp.resolvedValue, propType, this.component);
			if (propType.transform) return propType.transform(value, propType, this.component);
		}
		return value;
	}
	_createAsyncPropData(propName, defaultValue) {
		if (!this.asyncProps[propName]) {
			const propTypes = this.component && this.component.props[PROP_TYPES_SYMBOL];
			this.asyncProps[propName] = {
				type: propTypes && propTypes[propName],
				lastValue: null,
				resolvedValue: defaultValue,
				pendingLoadCount: 0,
				resolvedLoadCount: 0
			};
		}
	}
};
//#endregion
//#region node_modules/@deck.gl/core/dist/lib/layer-state.js
var LayerState = class extends ComponentState {
	constructor({ attributeManager, layer }) {
		super(layer);
		this.attributeManager = attributeManager;
		this.needsRedraw = true;
		this.needsUpdate = true;
		this.subLayers = null;
		this.usesPickingColorCache = false;
	}
	get layer() {
		return this.component;
	}
	_fetch(propName, url) {
		const layer = this.layer;
		const fetch = layer?.props.fetch;
		if (fetch) return fetch(url, {
			propName,
			layer
		});
		return super._fetch(propName, url);
	}
	_onResolve(propName, value) {
		const layer = this.layer;
		if (layer) {
			const onDataLoad = layer.props.onDataLoad;
			if (propName === "data" && onDataLoad) onDataLoad(value, {
				propName,
				layer
			});
		}
	}
	_onError(propName, error) {
		const layer = this.layer;
		if (layer) layer.raiseError(error, `loading ${propName} of ${this.layer}`);
	}
};
//#endregion
//#region node_modules/@deck.gl/core/dist/lib/layer.js
var TRACE_CHANGE_FLAG = "layer.changeFlag";
var TRACE_INITIALIZE = "layer.initialize";
var TRACE_UPDATE = "layer.update";
var TRACE_FINALIZE = "layer.finalize";
var TRACE_MATCHED = "layer.matched";
var MAX_PICKING_COLOR_CACHE_SIZE = 2 ** 24 - 1;
var EMPTY_ARRAY = Object.freeze([]);
var areViewportsEqual = memoize(({ oldViewport, viewport }) => {
	return oldViewport.equals(viewport);
});
var pickingColorCache = new Uint8ClampedArray(0);
var defaultProps = {
	data: {
		type: "data",
		value: EMPTY_ARRAY,
		async: true
	},
	dataComparator: {
		type: "function",
		value: null,
		optional: true
	},
	_dataDiff: {
		type: "function",
		value: (data) => data && data.__diff,
		optional: true
	},
	dataTransform: {
		type: "function",
		value: null,
		optional: true
	},
	onDataLoad: {
		type: "function",
		value: null,
		optional: true
	},
	onError: {
		type: "function",
		value: null,
		optional: true
	},
	fetch: {
		type: "function",
		value: (url, { propName, layer, loaders, loadOptions, signal }) => {
			const { resourceManager } = layer.context;
			loadOptions = loadOptions || layer.getLoadOptions();
			loaders = loaders || layer.props.loaders;
			if (signal) loadOptions = {
				...loadOptions,
				core: {
					...loadOptions?.core,
					fetch: {
						...loadOptions?.core?.fetch,
						signal
					}
				}
			};
			let inResourceManager = resourceManager.contains(url);
			if (!inResourceManager && !loadOptions) {
				resourceManager.add({
					resourceId: url,
					data: load(url, loaders),
					persistent: false
				});
				inResourceManager = true;
			}
			if (inResourceManager) return resourceManager.subscribe({
				resourceId: url,
				onChange: (data) => layer.internalState?.reloadAsyncProp(propName, data),
				consumerId: layer.id,
				requestId: propName
			});
			return load(url, loaders, loadOptions);
		}
	},
	updateTriggers: {},
	visible: true,
	pickable: false,
	opacity: {
		type: "number",
		min: 0,
		max: 1,
		value: 1
	},
	operation: "draw",
	onHover: {
		type: "function",
		value: null,
		optional: true
	},
	onClick: {
		type: "function",
		value: null,
		optional: true
	},
	onDragStart: {
		type: "function",
		value: null,
		optional: true
	},
	onDrag: {
		type: "function",
		value: null,
		optional: true
	},
	onDragEnd: {
		type: "function",
		value: null,
		optional: true
	},
	coordinateSystem: "default",
	coordinateOrigin: {
		type: "array",
		value: [
			0,
			0,
			0
		],
		compare: true
	},
	modelMatrix: {
		type: "array",
		value: null,
		compare: true,
		optional: true
	},
	wrapLongitude: false,
	positionFormat: "XYZ",
	colorFormat: "RGBA",
	parameters: {
		type: "object",
		value: {},
		optional: true,
		compare: 2
	},
	loadOptions: {
		type: "object",
		value: null,
		optional: true,
		ignore: true
	},
	transitions: null,
	extensions: [],
	loaders: {
		type: "array",
		value: [],
		optional: true,
		ignore: true
	},
	getPolygonOffset: {
		type: "function",
		value: ({ layerIndex }) => [0, -layerIndex * 100]
	},
	highlightedObjectIndex: null,
	autoHighlight: false,
	highlightColor: {
		type: "accessor",
		value: [
			0,
			0,
			128,
			128
		]
	}
};
var Layer = class extends Component {
	constructor() {
		super(...arguments);
		this.internalState = null;
		this.lifecycle = LIFECYCLE.NO_STATE;
		this.parent = null;
	}
	static get componentName() {
		return Object.prototype.hasOwnProperty.call(this, "layerName") ? this.layerName : "";
	}
	get root() {
		let layer = this;
		while (layer.parent) layer = layer.parent;
		return layer;
	}
	toString() {
		return `${this.constructor.layerName || this.constructor.name}({id: '${this.props.id}'})`;
	}
	/** Projects a point with current view state from the current layer's coordinate system to screen */
	project(xyz) {
		assert(this.internalState);
		const viewport = this.internalState.viewport || this.context.viewport;
		const [x, y, z] = worldToPixels(getWorldPosition(xyz, {
			viewport,
			modelMatrix: this.props.modelMatrix,
			coordinateOrigin: this.props.coordinateOrigin,
			coordinateSystem: this.props.coordinateSystem
		}), viewport.pixelProjectionMatrix);
		return xyz.length === 2 ? [x, y] : [
			x,
			y,
			z
		];
	}
	/** Unprojects a screen pixel to the current view's default coordinate system
	Note: this does not reverse `project`. */
	unproject(xy) {
		assert(this.internalState);
		return (this.internalState.viewport || this.context.viewport).unproject(xy);
	}
	/** Projects a point with current view state from the current layer's coordinate system to the world space */
	projectPosition(xyz, params) {
		assert(this.internalState);
		return projectPosition(xyz, {
			viewport: this.internalState.viewport || this.context.viewport,
			modelMatrix: this.props.modelMatrix,
			coordinateOrigin: this.props.coordinateOrigin,
			coordinateSystem: this.props.coordinateSystem,
			...params
		});
	}
	/** `true` if this layer renders other layers */
	get isComposite() {
		return false;
	}
	/** `true` if the layer renders to screen */
	get isDrawable() {
		return true;
	}
	/** Updates selected state members and marks the layer for redraw */
	setState(partialState) {
		this.setChangeFlags({ stateChanged: true });
		Object.assign(this.state, partialState);
		this.setNeedsRedraw();
	}
	/** Sets the redraw flag for this layer, will trigger a redraw next animation frame */
	setNeedsRedraw() {
		if (this.internalState) this.internalState.needsRedraw = true;
	}
	/** Mark this layer as needs a deep update */
	setNeedsUpdate() {
		if (this.internalState) {
			this.context.layerManager.setNeedsUpdate(String(this));
			this.internalState.needsUpdate = true;
		}
	}
	/** Returns true if all async resources are loaded */
	get isLoaded() {
		return this.internalState ? !this.internalState.isAsyncPropLoading() : false;
	}
	/** Returns true if using shader-based WGS84 longitude wrapping */
	get wrapLongitude() {
		return this.props.wrapLongitude;
	}
	/** @deprecated Returns true if the layer is visible in the picking pass */
	isPickable() {
		return this.props.pickable && this.props.visible;
	}
	/** Returns an array of models used by this layer, can be overriden by layer subclass */
	getModels() {
		const state = this.state;
		return state && (state.models || state.model && [state.model]) || [];
	}
	/** Update shader input parameters */
	setShaderModuleProps(...props) {
		for (const model of this.getModels()) model.shaderInputs.setProps(...props);
	}
	/** Returns the attribute manager of this layer */
	getAttributeManager() {
		return this.internalState && this.internalState.attributeManager;
	}
	/** Returns the most recent layer that matched to this state
	(When reacting to an async event, this layer may no longer be the latest) */
	getCurrentLayer() {
		return this.internalState && this.internalState.layer;
	}
	/** Returns the default parse options for async props */
	getLoadOptions() {
		return this.props.loadOptions;
	}
	use64bitPositions() {
		const { coordinateSystem } = this.props;
		return coordinateSystem === "default" || coordinateSystem === "lnglat" || coordinateSystem === "cartesian";
	}
	onHover(info, pickingEvent) {
		if (this.props.onHover) return this.props.onHover(info, pickingEvent) || false;
		return false;
	}
	onClick(info, pickingEvent) {
		if (this.props.onClick) return this.props.onClick(info, pickingEvent) || false;
		return false;
	}
	nullPickingColor() {
		return [
			0,
			0,
			0
		];
	}
	encodePickingColor(i, target = []) {
		target[0] = i + 1 & 255;
		target[1] = i + 1 >> 8 & 255;
		target[2] = i + 1 >> 8 >> 8 & 255;
		return target;
	}
	decodePickingColor(color) {
		assert(color instanceof Uint8Array);
		const [i1, i2, i3] = color;
		return i1 + i2 * 256 + i3 * 65536 - 1;
	}
	/** Deduces number of instances. Intention is to support:
	- Explicit setting of numInstances
	- Auto-deduction for ES6 containers that define a size member
	- Auto-deduction for Classic Arrays via the built-in length attribute
	- Auto-deduction via arrays */
	getNumInstances() {
		if (Number.isFinite(this.props.numInstances)) return this.props.numInstances;
		if (this.state && this.state.numInstances !== void 0) return this.state.numInstances;
		return count(this.props.data);
	}
	/** Buffer layout describes how many attribute values are packed for each data object
	The default (null) is one value each object.
	Some data formats (e.g. paths, polygons) have various length. Their buffer layout
	is in the form of [L0, L1, L2, ...] */
	getStartIndices() {
		if (this.props.startIndices) return this.props.startIndices;
		if (this.state && this.state.startIndices) return this.state.startIndices;
		return null;
	}
	getBounds() {
		return this.getAttributeManager()?.getBounds(["positions", "instancePositions"]);
	}
	getShaders(shaders) {
		shaders = mergeShaders(shaders, {
			disableWarnings: true,
			modules: this.context.defaultShaderModules
		});
		for (const extension of this.props.extensions) shaders = mergeShaders(shaders, extension.getShaders.call(this, extension));
		return shaders;
	}
	/** Controls if updateState should be called. By default returns true if any prop has changed */
	shouldUpdateState(params) {
		return params.changeFlags.propsOrDataChanged;
	}
	/** Default implementation, all attributes will be invalidated and updated when data changes */
	updateState(params) {
		const attributeManager = this.getAttributeManager();
		const { dataChanged } = params.changeFlags;
		if (dataChanged && attributeManager) if (Array.isArray(dataChanged)) for (const dataRange of dataChanged) attributeManager.invalidateAll(dataRange);
		else attributeManager.invalidateAll();
		if (attributeManager) {
			const { props } = params;
			const hasPickingBuffer = this.internalState.hasPickingBuffer;
			const needsPickingBuffer = Number.isInteger(props.highlightedObjectIndex) || Boolean(props.pickable) || props.extensions.some((extension) => extension.getNeedsPickingBuffer.call(this, extension));
			if (hasPickingBuffer !== needsPickingBuffer) {
				this.internalState.hasPickingBuffer = needsPickingBuffer;
				const { pickingColors, instancePickingColors } = attributeManager.attributes;
				const pickingColorsAttribute = pickingColors || instancePickingColors;
				if (pickingColorsAttribute) {
					if (needsPickingBuffer && pickingColorsAttribute.constant) {
						pickingColorsAttribute.constant = false;
						attributeManager.invalidate(pickingColorsAttribute.id);
					}
					if (!pickingColorsAttribute.value && !needsPickingBuffer) {
						pickingColorsAttribute.constant = true;
						pickingColorsAttribute.value = [
							0,
							0,
							0
						];
					}
				}
			}
		}
	}
	/** Called once when layer is no longer matched and state will be discarded. Layers can destroy WebGL resources here. */
	finalizeState(context) {
		for (const model of this.getModels()) model.destroy();
		const attributeManager = this.getAttributeManager();
		if (attributeManager) attributeManager.finalize();
		if (this.context) this.context.resourceManager.unsubscribe({ consumerId: this.id });
		if (this.internalState) {
			this.internalState.uniformTransitions.clear();
			this.internalState.finalize();
		}
	}
	draw(opts) {
		for (const model of this.getModels()) model.draw(opts.renderPass);
	}
	getPickingInfo({ info, mode, sourceLayer }) {
		const { index } = info;
		if (index >= 0) {
			if (Array.isArray(this.props.data)) info.object = this.props.data[index];
		}
		return info;
	}
	/** (Internal) Propagate an error event through the system */
	raiseError(error, message) {
		if (message) error = new Error(`${message}: ${error.message}`, { cause: error });
		if (!this.props.onError?.(error)) this.context?.onError?.(error, this);
	}
	/** (Internal) Checks if this layer needs redraw */
	getNeedsRedraw(opts = { clearRedrawFlags: false }) {
		return this._getNeedsRedraw(opts);
	}
	/** (Internal) Checks if this layer needs a deep update */
	needsUpdate() {
		if (!this.internalState) return false;
		return this.internalState.needsUpdate || this.hasUniformTransition() || this.shouldUpdateState(this._getUpdateParams());
	}
	/** Checks if this layer has ongoing uniform transition */
	hasUniformTransition() {
		return this.internalState?.uniformTransitions.active || false;
	}
	/** Called when this layer is rendered into the given viewport */
	activateViewport(viewport) {
		if (!this.internalState) return;
		const oldViewport = this.internalState.viewport;
		this.internalState.viewport = viewport;
		if (!oldViewport || !areViewportsEqual({
			oldViewport,
			viewport
		})) {
			this.setChangeFlags({ viewportChanged: true });
			if (this.isComposite) {
				if (this.needsUpdate()) this.setNeedsUpdate();
			} else this._update();
		}
	}
	/** Default implementation of attribute invalidation, can be redefined */
	invalidateAttribute(name = "all") {
		const attributeManager = this.getAttributeManager();
		if (!attributeManager) return;
		if (name === "all") attributeManager.invalidateAll();
		else attributeManager.invalidate(name);
	}
	/** Send updated attributes to the WebGL model */
	updateAttributes(changedAttributes) {
		let bufferLayoutChanged = false;
		for (const id in changedAttributes) if (changedAttributes[id].layoutChanged()) bufferLayoutChanged = true;
		for (const model of this.getModels()) this._setModelAttributes(model, changedAttributes, bufferLayoutChanged);
	}
	/** Recalculate any attributes if needed */
	_updateAttributes() {
		const attributeManager = this.getAttributeManager();
		if (!attributeManager) return;
		const props = this.props;
		const numInstances = this.getNumInstances();
		const startIndices = this.getStartIndices();
		attributeManager.update({
			data: props.data,
			numInstances,
			startIndices,
			props,
			transitions: props.transitions,
			buffers: props.data.attributes,
			context: this
		});
		const changedAttributes = attributeManager.getChangedAttributes({ clearChangedFlags: true });
		this.updateAttributes(changedAttributes);
	}
	/** Update attribute transitions. This is called in drawLayer, no model updates required. */
	_updateAttributeTransition() {
		const attributeManager = this.getAttributeManager();
		if (attributeManager) attributeManager.updateTransition();
	}
	/** Update uniform (prop) transitions. This is called in updateState, may result in model updates. */
	_updateUniformTransition() {
		const { uniformTransitions } = this.internalState;
		if (uniformTransitions.active) {
			const propsInTransition = uniformTransitions.update();
			const props = Object.create(this.props);
			for (const key in propsInTransition) Object.defineProperty(props, key, { value: propsInTransition[key] });
			return props;
		}
		return this.props;
	}
	/** Updater for the automatically populated instancePickingColors attribute */
	calculateInstancePickingColors(attribute, { numInstances }) {
		if (attribute.constant) return;
		const cacheSize = Math.floor(pickingColorCache.length / 4);
		this.internalState.usesPickingColorCache = true;
		if (cacheSize < numInstances) {
			if (numInstances > MAX_PICKING_COLOR_CACHE_SIZE) defaultLogger.warn("Layer has too many data objects. Picking might not be able to distinguish all objects.")();
			pickingColorCache = typed_array_manager_default.allocate(pickingColorCache, numInstances, {
				size: 4,
				copy: true,
				maxCount: Math.max(numInstances, MAX_PICKING_COLOR_CACHE_SIZE)
			});
			const newCacheSize = Math.floor(pickingColorCache.length / 4);
			const pickingColor = [
				0,
				0,
				0
			];
			for (let i = cacheSize; i < newCacheSize; i++) {
				this.encodePickingColor(i, pickingColor);
				pickingColorCache[i * 4 + 0] = pickingColor[0];
				pickingColorCache[i * 4 + 1] = pickingColor[1];
				pickingColorCache[i * 4 + 2] = pickingColor[2];
				pickingColorCache[i * 4 + 3] = 0;
			}
		}
		attribute.value = pickingColorCache.subarray(0, numInstances * 4);
	}
	/** Apply changed attributes to model */
	_setModelAttributes(model, changedAttributes, bufferLayoutChanged = false) {
		if (!Object.keys(changedAttributes).length) return;
		if (bufferLayoutChanged) {
			const attributeManager = this.getAttributeManager();
			model.setBufferLayout(attributeManager.getBufferLayouts(model));
			changedAttributes = attributeManager.getAttributes();
		}
		const excludeAttributes = model.userData?.excludeAttributes || {};
		const attributeBuffers = {};
		const constantAttributes = {};
		for (const name in changedAttributes) {
			if (excludeAttributes[name]) continue;
			const values = changedAttributes[name].getValue();
			for (const attributeName in values) {
				const value = values[attributeName];
				if (value instanceof Buffer) if (changedAttributes[name].settings.isIndexed) model.setIndexBuffer(value);
				else attributeBuffers[attributeName] = value;
				else if (value) constantAttributes[attributeName] = value;
			}
		}
		model.setAttributes(attributeBuffers);
		model.setConstantAttributes(constantAttributes);
	}
	/** (Internal) Sets the picking color at the specified index to null picking color. Used for multi-depth picking.
	This method may be overriden by layer implementations */
	disablePickingIndex(objectIndex) {
		const data = this.props.data;
		if (!("attributes" in data)) {
			this._disablePickingIndex(objectIndex);
			return;
		}
		const { pickingColors, instancePickingColors } = this.getAttributeManager().attributes;
		const colors = pickingColors || instancePickingColors;
		const externalColorAttribute = colors && data.attributes && data.attributes[colors.id];
		if (externalColorAttribute && externalColorAttribute.value) {
			const values = externalColorAttribute.value;
			const objectColor = this.encodePickingColor(objectIndex);
			for (let index = 0; index < data.length; index++) {
				const i = colors.getVertexOffset(index);
				if (values[i] === objectColor[0] && values[i + 1] === objectColor[1] && values[i + 2] === objectColor[2]) this._disablePickingIndex(index);
			}
		} else this._disablePickingIndex(objectIndex);
	}
	_disablePickingIndex(objectIndex) {
		const { pickingColors, instancePickingColors } = this.getAttributeManager().attributes;
		const colors = pickingColors || instancePickingColors;
		if (!colors) return;
		const start = colors.getVertexOffset(objectIndex);
		const end = colors.getVertexOffset(objectIndex + 1);
		colors.buffer.write(new Uint8Array(end - start), start);
	}
	/** (Internal) Re-enable all picking indices after multi-depth picking */
	restorePickingColors() {
		const { pickingColors, instancePickingColors } = this.getAttributeManager().attributes;
		const colors = pickingColors || instancePickingColors;
		if (!colors) return;
		if (this.internalState.usesPickingColorCache && colors.value.buffer !== pickingColorCache.buffer) colors.value = pickingColorCache.subarray(0, colors.value.length);
		colors.updateSubBuffer({ startOffset: 0 });
	}
	_initialize() {
		assert(!this.internalState);
		debug(TRACE_INITIALIZE, this);
		const attributeManager = this._getAttributeManager();
		if (attributeManager) attributeManager.addInstanced({ instancePickingColors: {
			type: "uint8",
			size: 4,
			noAlloc: true,
			update: this.calculateInstancePickingColors
		} });
		this.internalState = new LayerState({
			attributeManager,
			layer: this
		});
		this._clearChangeFlags();
		this.state = {};
		Object.defineProperty(this.state, "attributeManager", { get: () => {
			defaultLogger.deprecated("layer.state.attributeManager", "layer.getAttributeManager()")();
			return attributeManager;
		} });
		this.internalState.uniformTransitions = new UniformTransitionManager(this.context.timeline);
		this.internalState.onAsyncPropUpdated = this._onAsyncPropUpdated.bind(this);
		this.internalState.setAsyncProps(this.props);
		this.initializeState(this.context);
		for (const extension of this.props.extensions) extension.initializeState.call(this, this.context, extension);
		this.setChangeFlags({
			dataChanged: "init",
			propsChanged: "init",
			viewportChanged: true,
			extensionsChanged: true
		});
		this._update();
	}
	/** (Internal) Called by layer manager to transfer state from an old layer */
	_transferState(oldLayer) {
		debug(TRACE_MATCHED, this, this === oldLayer);
		const { state, internalState } = oldLayer;
		if (this === oldLayer) return;
		this.internalState = internalState;
		this.state = state;
		this.internalState.setAsyncProps(this.props);
		this._diffProps(this.props, this.internalState.getOldProps());
	}
	/** (Internal) Called by layer manager when a new layer is added or an existing layer is matched with a new instance */
	_update() {
		const stateNeedsUpdate = this.needsUpdate();
		debug(TRACE_UPDATE, this, stateNeedsUpdate);
		if (!stateNeedsUpdate) return;
		this.context.stats.get("Layer updates").incrementCount();
		const currentProps = this.props;
		const context = this.context;
		const internalState = this.internalState;
		const currentViewport = context.viewport;
		const propsInTransition = this._updateUniformTransition();
		internalState.propsInTransition = propsInTransition;
		context.viewport = internalState.viewport || currentViewport;
		this.props = propsInTransition;
		try {
			const updateParams = this._getUpdateParams();
			const oldModels = this.getModels();
			if (context.device) this.updateState(updateParams);
			else try {
				this.updateState(updateParams);
			} catch (error) {}
			for (const extension of this.props.extensions) extension.updateState.call(this, updateParams, extension);
			this.setNeedsRedraw();
			this._updateAttributes();
			const modelChanged = this.getModels()[0] !== oldModels[0];
			this._postUpdate(updateParams, modelChanged);
		} finally {
			context.viewport = currentViewport;
			this.props = currentProps;
			this._clearChangeFlags();
			internalState.needsUpdate = false;
			internalState.resetOldProps();
		}
	}
	/** (Internal) Called by manager when layer is about to be disposed
	Note: not guaranteed to be called on application shutdown */
	_finalize() {
		debug(TRACE_FINALIZE, this);
		this.finalizeState(this.context);
		for (const extension of this.props.extensions) extension.finalizeState.call(this, this.context, extension);
	}
	_drawLayer({ renderPass, shaderModuleProps = null, uniforms = {}, parameters = {} }) {
		this._updateAttributeTransition();
		const currentProps = this.props;
		const context = this.context;
		this.props = this.internalState.propsInTransition || currentProps;
		try {
			if (shaderModuleProps) this.setShaderModuleProps(shaderModuleProps);
			const { getPolygonOffset } = this.props;
			const offsets = getPolygonOffset && getPolygonOffset(uniforms) || [0, 0];
			if (context.device instanceof WebGLDevice) context.device.setParametersWebGL({ polygonOffset: offsets });
			const webGPUDrawParameters = context.device instanceof WebGLDevice ? null : splitWebGPUDrawParameters(parameters);
			applyModelParameters(this.getModels(), renderPass, parameters, webGPUDrawParameters);
			if (context.device instanceof WebGLDevice) context.device.withParametersWebGL(parameters, () => {
				const opts = {
					renderPass,
					shaderModuleProps,
					uniforms,
					parameters,
					context
				};
				for (const extension of this.props.extensions) extension.draw.call(this, opts, extension);
				this.draw(opts);
			});
			else {
				if (webGPUDrawParameters?.renderPassParameters) renderPass.setParameters(webGPUDrawParameters.renderPassParameters);
				const opts = {
					renderPass,
					shaderModuleProps,
					uniforms,
					parameters,
					context
				};
				for (const extension of this.props.extensions) extension.draw.call(this, opts, extension);
				this.draw(opts);
			}
		} finally {
			this.props = currentProps;
		}
	}
	/** Returns the current change flags */
	getChangeFlags() {
		return this.internalState?.changeFlags;
	}
	/** Dirty some change flags, will be handled by updateLayer */
	setChangeFlags(flags) {
		if (!this.internalState) return;
		const { changeFlags } = this.internalState;
		for (const key in flags) if (flags[key]) {
			let flagChanged = false;
			switch (key) {
				case "dataChanged":
					const dataChangedReason = flags[key];
					const prevDataChangedReason = changeFlags[key];
					if (dataChangedReason && Array.isArray(prevDataChangedReason)) {
						changeFlags.dataChanged = Array.isArray(dataChangedReason) ? prevDataChangedReason.concat(dataChangedReason) : dataChangedReason;
						flagChanged = true;
					}
				default: if (!changeFlags[key]) {
					changeFlags[key] = flags[key];
					flagChanged = true;
				}
			}
			if (flagChanged) debug(TRACE_CHANGE_FLAG, this, key, flags);
		}
		const propsOrDataChanged = Boolean(changeFlags.dataChanged || changeFlags.updateTriggersChanged || changeFlags.propsChanged || changeFlags.extensionsChanged);
		changeFlags.propsOrDataChanged = propsOrDataChanged;
		changeFlags.somethingChanged = propsOrDataChanged || changeFlags.viewportChanged || changeFlags.stateChanged;
	}
	/** Clear all changeFlags, typically after an update */
	_clearChangeFlags() {
		this.internalState.changeFlags = {
			dataChanged: false,
			propsChanged: false,
			updateTriggersChanged: false,
			viewportChanged: false,
			stateChanged: false,
			extensionsChanged: false,
			propsOrDataChanged: false,
			somethingChanged: false
		};
	}
	/** Compares the layers props with old props from a matched older layer
	and extracts change flags that describe what has change so that state
	can be update correctly with minimal effort */
	_diffProps(newProps, oldProps) {
		const changeFlags = diffProps(newProps, oldProps);
		if (changeFlags.updateTriggersChanged) {
			for (const key in changeFlags.updateTriggersChanged) if (changeFlags.updateTriggersChanged[key]) this.invalidateAttribute(key);
		}
		if (changeFlags.transitionsChanged) for (const key in changeFlags.transitionsChanged) this.internalState.uniformTransitions.add(key, oldProps[key], newProps[key], newProps.transitions?.[key]);
		return this.setChangeFlags(changeFlags);
	}
	/** (Internal) called by layer manager to perform extra props validation (in development only) */
	validateProps() {
		validateProps(this.props);
	}
	/** (Internal) Called by deck picker when the hovered object changes to update the auto highlight */
	updateAutoHighlight(info) {
		if (this.props.autoHighlight && !Number.isInteger(this.props.highlightedObjectIndex)) this._updateAutoHighlight(info);
	}
	/** Update picking module parameters to highlight the hovered object */
	_updateAutoHighlight(info) {
		const picking = { highlightedObjectColor: info.picked ? info.color : null };
		const { highlightColor } = this.props;
		if (info.picked && typeof highlightColor === "function") picking.highlightColor = highlightColor(info);
		this.setShaderModuleProps({ picking });
		this.setNeedsRedraw();
	}
	/** Create new attribute manager */
	_getAttributeManager() {
		const context = this.context;
		return new AttributeManager(context.device, {
			id: this.props.id,
			stats: context.stats,
			timeline: context.timeline
		});
	}
	/** Called after updateState to perform common tasks */
	_postUpdate(updateParams, forceUpdate) {
		const { props, oldProps } = updateParams;
		const model = this.state.model;
		if (model?.isInstanced) model.setInstanceCount(this.getNumInstances());
		const { autoHighlight, highlightedObjectIndex, highlightColor } = props;
		if (forceUpdate || oldProps.autoHighlight !== autoHighlight || oldProps.highlightedObjectIndex !== highlightedObjectIndex || oldProps.highlightColor !== highlightColor) {
			const picking = {};
			if (Array.isArray(highlightColor)) picking.highlightColor = highlightColor;
			if (forceUpdate || oldProps.autoHighlight !== autoHighlight || highlightedObjectIndex !== oldProps.highlightedObjectIndex) picking.highlightedObjectColor = Number.isFinite(highlightedObjectIndex) && highlightedObjectIndex >= 0 ? this.encodePickingColor(highlightedObjectIndex) : null;
			this.setShaderModuleProps({ picking });
		}
	}
	_getUpdateParams() {
		return {
			props: this.props,
			oldProps: this.internalState.getOldProps(),
			context: this.context,
			changeFlags: this.internalState.changeFlags
		};
	}
	/** Checks state of attributes and model */
	_getNeedsRedraw(opts) {
		if (!this.internalState) return false;
		let redraw = false;
		redraw = redraw || this.internalState.needsRedraw && this.id;
		const attributeManager = this.getAttributeManager();
		const attributeManagerNeedsRedraw = attributeManager ? attributeManager.getNeedsRedraw(opts) : false;
		redraw = redraw || attributeManagerNeedsRedraw;
		if (redraw) for (const extension of this.props.extensions) extension.onNeedsRedraw.call(this, extension);
		this.internalState.needsRedraw = this.internalState.needsRedraw && !opts.clearRedrawFlags;
		return redraw;
	}
	/** Callback when asyn prop is loaded */
	_onAsyncPropUpdated() {
		this._diffProps(this.props, this.internalState.getOldProps());
		this.setNeedsUpdate();
	}
};
Layer.defaultProps = defaultProps;
Layer.layerName = "Layer";
function splitWebGPUDrawParameters(parameters) {
	const { blendConstant, ...pipelineParameters } = parameters;
	return blendConstant ? {
		pipelineParameters,
		renderPassParameters: { blendConstant }
	} : { pipelineParameters };
}
function applyModelParameters(models, renderPass, parameters, webGPUDrawParameters) {
	for (const model of models) if (model.device.type === "webgpu") {
		syncModelAttachmentFormats(model, renderPass);
		model.setParameters({
			...model.parameters,
			...webGPUDrawParameters?.pipelineParameters
		});
	} else model.setParameters(parameters);
}
function syncModelAttachmentFormats(model, renderPass) {
	const framebuffer = renderPass.props.framebuffer || (renderPass.framebuffer ?? null);
	if (!framebuffer) return;
	const colorAttachmentFormats = framebuffer.colorAttachments.map((attachment) => attachment?.texture?.format ?? null);
	const depthStencilAttachmentFormat = framebuffer.depthStencilAttachment?.texture?.format;
	const modelWithProps = model;
	if (!equalAttachmentFormats(modelWithProps.props.colorAttachmentFormats, colorAttachmentFormats) || modelWithProps.props.depthStencilAttachmentFormat !== depthStencilAttachmentFormat) {
		modelWithProps.props.colorAttachmentFormats = colorAttachmentFormats;
		modelWithProps.props.depthStencilAttachmentFormat = depthStencilAttachmentFormat;
		modelWithProps._setPipelineNeedsUpdate("attachment formats");
	}
}
function equalAttachmentFormats(left, right) {
	if (left === right) return true;
	if (!left || !right || left.length !== right.length) return false;
	for (let i = 0; i < left.length; i++) if (left[i] !== right[i]) return false;
	return true;
}
//#endregion
export { registerLoaders as _, Transition as a, PROP_TYPES_SYMBOL as c, color_default as d, normalizeByteColor3 as f, load as g, register as h, assert as i, picking_default as l, debug as m, createIterable as n, flatten as o, resolveUseByteColors as p, getAccessorFromBuffer as r, LIFECYCLE as s, Layer as t, project32_default as u, isBrowser$1 as v, assert$2 as y };

//# sourceMappingURL=layer-DR7LLdmp.js.map