/*! stage.gl.js v1.0.0 | (c) 2015 Johann Troendle | https://github.com/JoTrdl/stage.gl */
;(function(exports) {

  'use strict';

  // Namespace
  var Stage = {};

  var extend = function(obj, source) {
    for (var key in source) {
      if (source.hasOwnProperty(key))
        obj[key] = source[key];
    }
    return obj;
  };

  /**
   * Base effect
   */
  Stage.Effect = function() {};
  Stage.Effect.extend = function(source) {
    var e = function() {};
    extend(e.prototype, Stage.Effect.prototype);
    extend(e.prototype, source);
    return e;
  };

  Stage.Effect.prototype = {
    index: 0,

    initialize: function(ctx) {},
    update: function(ctx) {},
    resize: function(ctx) {}
  };

  /**
   * Timer
   */
  var Timer = function() {
    this.time = Date.now();
    this.dt = 0;
  };
  Timer.prototype.tick = function() {
    var t = Date.now();
    this.dt = t - this.time;
    this.time = t;
  };

  /**
   * Simple Performance monitoring.
   */
  var PerfMonitor = function(options) {
    this.lowCallback = options && options.low || function() {};
    this.minFPS = options && options.minFPS || 24;
    this.samples = options && options.samples || 48;

    this.reset();
  };
  PerfMonitor.prototype.reset = function() {
    this.fps = 0;
    this.records = [];
    this.complete = false;
  };
  PerfMonitor.prototype.record = function(dt) {
    var fps = 1000/dt, delta;

    this.records.push(fps);
    this.complete = this.records.length > this.samples;

    if (this.complete) {
      var v = this.records.shift();
      delta = v - this.fps;
      this.fps -= delta/this.records.length;

      // Check if low
      if (this.fps < this.minFPS) {
        this.lowCallback(this.fps);
        this.reset();
        return this;
      }
    }

    delta = fps - this.fps;
    this.fps += delta/this.records.length;

    return this;
  };

  /**
   * Utils to retrieve 3d context
   * @param  {HTMLCanvasElement} canvas  The canvas
   * @param  {Object}            options Options for getContext()
   * 
   * @return {Context3d}         Context or null if unavailable.
   */
  var getContext = function(canvas, options) {
    return canvas.getContext('webgl', options) || canvas.getContext('experimental-webgl', options);
  };

  /**
   * Renderer
   * @param {HTMLCanvasElement} canvas The canvas
   */
  Stage.Renderer = function(canvas, options) {
    this.canvas = canvas;
    this.gl = getContext(canvas, options && options.gl);
    if (!this.gl) {
      throw 'WebGl is not supported';
    }
    this.effects = [];

    this.options = options || {};
    this.events = {};

    this.container = this.options.container || window;

    this.context = {
      gl: this.gl,
      width: this.container.offsetWidth || this.container.innerWidth,
      height: this.container.offsetHeight || this.container.innerHeight,
      aspect: this.width / this.height
    };

    window.addEventListener('resize', this.resize.bind(this));
  };

  /**
   * Add a listener on event
   * @param  {String}   name     Event name
   * @param  {Function} callback The callback
   */
  Stage.Renderer.prototype.on = function(name, callback) {
    if (!this.events[name]) {
      this.events[name] = [];
    }
    this.events[name].push(callback);
    return this;
  };

  /**
   * Trigger an event.
   * @param  {String} name Event name.
   */
  Stage.Renderer.prototype.trigger = function(name) {
    if (!this.events[name]) {
      return;
    }
    for (var i = 0; i < this.events[name].length; i++) {
      this.events[name][i](this.context);
    }
    return this;
  };

  /**
   * Add an effect on the stack.
   * Effects are sorted using the effect.index property.
   * @param  {Effect} effect Effect to add.
   */
  Stage.Renderer.prototype.effect = function(effect) {
    this.effects.push(effect);
    return this;
  };

  /**
   * Start rendering.
   */
  Stage.Renderer.prototype.render = function() {
    var self = this;

    // Sort effects
    this.effects.sort(function(a, b) {
      return a.index - b.index;
    });

    // Initialize effects
    for (var i = 0; i < this.effects.length; i++) {
      this.effects[i].initialize(this.context);
    }

    // Start timer
    this.context.timer = new Timer();
    this.monitor = new PerfMonitor({
      low: function() {
        // Received a low FPS warning, split the size by 2
        this.context.width /= 2;
        this.context.height /= 2;
      }
    });

    // Rendering loop
    function loop() {
      requestAnimationFrame(loop);
      self.trigger('update');

      self.context.timer.tick();
      self.context.fps = self.monitor.record(self.context.timer.dt).fps;

      for (var i = 0; i < self.effects.length; i++) {
        self.effects[i].update(self.context);
      }
    }
    loop();
    
    return this;
  };

  /**
   * Resize renderer.
   */
  Stage.Renderer.prototype.resize = function() {

    this.context.width = this.container.offsetWidth || this.container.innerWidth;
    this.context.height = this.container.offsetHeight || this.container.innerHeight;
    this.context.aspect = this.width / this.height;

    for (var i = 0; i < this.effects.length; i++) {
      this.effects[i].resize(this.context);
    }

    this.monitor.reset();
    
    return this;
  };

  // Exports
  exports.Stage = Stage;

})(window);
