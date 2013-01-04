/* vim:set ts=4 sw=4 sts=4 expandtab */
/*jshint undef: true es5: true node: true devel: true evil: true
         forin: true latedef: false supernew: true */
/*global define: true */

"use strict";

var UUID = 0;

var Base = module.exports = Object.freeze(Object.create(Object.prototype, {
    UUID: {
        value: UUID
    },
    UUIDS: {
        value: [UUID]
    },
    /**
     *  Base.news() -> Object
     *
     *  Creates an object that inherits from `this` object (Analog of
     *  `new Object()`).
     *
     *  ## Example
     *
     *      var Dog = Base.extend({
     *          bark: function bark() {
     *              return "Ruff! Ruff!";
     *          }
     *      });
     *      var dog = Dog.new();
     **/
     "new": {
        value: function create() {
            var object = Object.create(this);
            object.initialize.apply(object, arguments);
            return object;
        }
    },
    /**
     *  Base#intialize() -> null
     *
     *  When new instance of the this prototype is created it's `initialize`
     *  method is called with all the arguments passed to the `new`. You can
     *  override `initialize` to set up an instance.
     **/
    initialize: {
        value: function initialize() {}
    },
    /**
     *  Base#merge(obj1[, obj2][, obj3]) -> null
     *  - obj1 (Object): override prototype's properties with the values in this object
     *
     *  Merges all the properties of the passed objects into `this` instance (This
     *  method can be used on instances only as prototype objects are frozen).
     *
     *  If two or more argument objects have own properties with the same name,
     *  the property is overridden, with precedence from right to left, implying,
     *  that properties of the object on the left are overridden by a same named
     *  property of the object on the right.
     *
     *  ## Example
     *
     *      var Pet = Dog.extend({
     *          initialize: function initialize(options) {
     *              // this.name = options.name -> would have thrown (frozen prototype)
     *              this.merge(options) // will override all properties.
     *          },
     *          call: function(name) {
     *              return this.name === name ? this.bark() : "";
     *          },
     *          name: null
     *      });
     *      var pet = Pet.new({ name: "Pippa", breed: "Jack Russell" });
     *      pet.call("Pippa");   // 'Ruff! Ruff!'
     **/
    merge: {
        value: function merge() {
            var descriptor = {};
            var uuids = this.UUIDS || [this.UUID || 0];
            var base = this.UUID = 0;
            Array.prototype.forEach.call(arguments, function(properties) {
                if (!properties.hasOwnProperty("UUID")) {
                    properties.UUID = base | 1 << ++UUID;
                    if (!properties.UUIDS)
                        properties.UUIDS = [];
                    properties.UUIDS.push(properties.UUID);
                }
                Object.getOwnPropertyNames(properties).forEach(function(name) {
                    if (name == "UUIDS")
                        uuids = uuids.concat(properties[name]);
                    else
                        descriptor[name] = Object.getOwnPropertyDescriptor(properties, name);
                });
            });
            uuids.forEach(function(uuid) {
                if (base & uuid)
                    return;
                base = base | uuid;
            });
            base = base || (base | 1 << ++UUID);
            descriptor.UUID = {
                value: base
            };
            uuids.push(base);
            descriptor.UUIDS = {
                value: uuids
            };
            Object.defineProperties(this, descriptor);
            return this;
        }
    },
    /**
     *  Base.extend(obj1[, obj2][obj3]) -> Object
     *  - obj1 (Object): extend object's properties with the values in this object
     *
     *  Takes any number of argument objects and returns frozen, composite object
     *  that inherits from `this` object and combines all of the own properties of
     *  the argument objects. (Objects returned by this function are frozen as
     *  they are intended to be used as types).
     *
     *  If two or more argument objects have own properties with the same name,
     *  the property is overridden, with precedence from right to left, implying,
     *  that properties of the object on the left are overridden by a same named
     *  property of the object on the right.
     *
     *  ## Examples
     *
     *      // ### Object composition ###
     *
     *      var HEX = Base.extend({
     *          hex: function hex() {
     *              return "#" + this.color;
     *          }
     *      });
     *
     *      var RGB = Base.extend({
     *          red: function red() {
     *              return parseInt(this.color.substr(0, 2), 16);
     *          },
     *          green: function green() {
     *              return parseInt(this.color.substr(2, 2), 16);
     *          },
     *          blue: function blue() {
     *              return parseInt(this.color.substr(4, 2), 16);
     *          }
     *      });
     *
     *      var CMYK = Base.extend(RGB, {
     *          black: function black() {
     *              var color = Math.max(Math.max(this.red(), this.green()), this.blue());
     *              return (1 - color / 255).toFixed(4);
     *          },
     *          cyan: function cyan() {
     *              var K = this.black();
     *              return (((1 - this.red() / 255).toFixed(4) - K) / (1 - K)).toFixed(4);
     *          },
     *          magenta: function magenta() {
     *              var K = this.black();
     *              return (((1 - this.green() / 255).toFixed(4) - K) / (1 - K)).toFixed(4);
     *          },
     *          yellow: function yellow() {
     *              var K = this.black();
     *              return (((1 - this.blue() / 255).toFixed(4) - K) / (1 - K)).toFixed(4);
     *          }
     *      });
     *
     *      var Color = Base.extend(HEX, RGB, CMYK, {
     *          initialize: function Color(color) {
     *              this.color = color;
     *          }
     *      });
     *
     *      // ### Prototypal inheritance ###
     *
     *      var Pixel = Color.extend({
     *          initialize: function Pixel(x, y, hex) {
     *              Color.initialize.call(this, hex);
     *              this.x = x;
     *              this.y = y;
     *          },
     *          toString: function toString() {
     *              return this.x + ":" + this.y + "@" + this.hex();
     *          }
     *      });
     *
     *      var pixel = Pixel.new(11, 23, "CC3399");
     *      pixel.toString(); // 11:23@#CC3399
     *
     *      pixel.red();      // 204
     *      pixel.green();    // 51
     *      pixel.blue();     // 153
     *
     *      pixel.cyan();     // 0.0000
     *      pixel.magenta();  // 0.7500
     *      pixel.yellow();   // 0.2500
     **/
    extend: {
        value: function extend() {
            return Object.freeze(this.merge.apply(Object.create(this), arguments));
        }
    },
    /**
     *  Base#hasFeature(obj) -> Boolean
     *  - obj1 (Object): check if this object is part of this object
     *
     *  Checks if an object was merged with this object, using Base.extend() or
     *  Base#merge(). Each object that was merged in at least once carries a
     *  signature in the shape of a bitflag.
     *
     *  ## Examples
     *
     *  To continue with the example provided by Base.extend():
     *
     *      // an instance of Color should contain the following objects:
     *      var color = Color.new("CC3399");
     *      color.hasFeature(HEX); // true
     *      color.hasFeature(RGB); // true
     *      color.hasFeature(CMYK); // true
     *      color.hasFeature(Pixel); // false
     *
     *      // an instance of Pixel should contain the following objects:
     *      var pixel = Pixel.new(11, 23, "CC3399");
     *      pixel.hasFeature(HEX); // true
     *      pixel.hasFeature(RGB); // true
     *      pixel.hasFeature(CMYK); // true
     *      pixel.hasFeature(Color); // true
     **/
    hasFeature: {
        value: function hasFeature(base) {
            return typeof base.UUID != "undefined" && this.UUIDS.indexOf(base.UUID) !== -1;
        }
    }
}));
