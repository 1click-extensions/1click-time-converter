
/**
 * @overview An Object Oriented JavaScript API for adding live digital clocks in
 * any timezone into web pages.
 *
 * Each digital clock is represented by an object with the prototype
 * {@link bartificer.Worldclock}.
 *
 * By default, the API will automatically convert any `span` `div`, paragraph
 * (`p`) or heading (`h1`, `h2` ...) with the class `bartificer-worldclock-auto`
 * into a world clock. This automatic generation can be suppressed by calling
 * {@link bartificer.Worldclock.suppressAutoLoading} after the API is loaded but
 * before the DOM becomes ready.
 *
 * The following HTML will be automatically converted into a clock with All
 * the default settings:
 *
 * ```
 * <span class="bartificer-worldclock-auto"></span>
 * ```
 *
 * The following HTML will be automatically converted into a clock showing
 * Dublin time with seconds showing:
 *
 * ```
 * <span class="bartificer-worldclock-auto" data-timezone="Europe/Dublin" data-show-seconds="true"></span>
 * ```
 *
 * This API assumes that jQuery ({@link http://jquery.org}) and MomentJS
 * Timezone ({@link http://momentjs.com/timezone/}) have been already been
 * included into the page before it is included.
 *
 * Styling the clocks is the responsibility of the user, however, a sample
 * style sheet is included in the source repository
 * (`lib/bartificer.worldclock.default.css`).
 *
 * @author Bart Busschots
 * @license BSD-2-Clause
 * @requires jQuery
 * @requires moment-timezone
 */

//
// === Add All Needed JSDoc Type definitions
//

/**
* An object created using `{}` or `new Object()`. jQuery's `$.isPlainObject()`
* function is used to validate this datatype.
* @typedef {Object} plainObject
*/

/**
 * A jQuery object representing exactly one element which is a `span`, `div`,
 * `paragraph`, or `heading`.
 * @typedef {Object} jQuerySingleContainer
 */

/**
 * A timezone string from the
 * [IANA Time Zone Database](https://en.wikipedia.org/wiki/Tz_database), or the
 * special string `LOCAL` to indicate that the timezone of the user's browser
 * should be used.
 *
 * A full list of the valid strings can be found in the
 * [third column of this listing](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones).
 * @typedef {string} timezone
 */


/**
 * An opacity value - a number between 0 and 1 inclusive, where 0 represents
 * fully transparent, and 1 fully opaque.
 * @typedef {number} opacity
 */

//
// === Check pre-requisites
//

// make sure jQuery is loaded
if(typeof jQuery !== 'function'){
	throw new Error('jQuery is required but not loaded');
}

// make sure MomentJS is loaded, along with timezone support
if(typeof moment !== 'function'){
	throw new Error('MomentJS is required but not loaded');
}
if(typeof moment.tz !== 'function'){
	throw new Error('MomentJS is loaded, but without Timezone support, which is required');
}

//
// === Initialise the bartificer namespace etc ===
//

/**
 * This namespace contains the public prototype {@link bartificer.Worldclock}.
 *
 * It also contains a number of private inner functions and variables which are
 * used by the {@link bartificer.Worldclock} prototype.
 *
 * @namespace
 */
var bartificer = bartificer ? bartificer : {};
(function(bartificer, $, undefined){
    //
    // === Define any needed validaiton functions
    //

    /**
     * Test if a given value is a plain object.
     *
     * @memberof bartificer
     * @inner
     * @private
     * @param  {*} obj The value to test.
     * @return {boolean} `true` if the value is a reference to a plain object,
     * `false` otherwise.
     * @see plainObject
     */
    function isPlainObject(obj){
        return $.isPlainObject(obj) ? true : false;
    }

    /**
     * Validation function to check if a given value is a reference to a jQuery
     * object representing exactly one valid container.
     *
     * @memberof bartificer
     * @inner
     * @private
     * @param  {*} obj The value to test.
     * @return {boolean} `true` of the value is valid, `false` otherwise.
     * @see jQuerySingleContainer
     */
    function isJQuerySingleContainer(obj){
        if(typeof obj !== 'object'){
            return false;
        }
        if(!(obj instanceof $)){
            return false;
        }
        if(obj.length !== 1){
            return false;
        }
        return obj.is('span, div, p, h1, h2, h3, h4, h5, h6') ? true : false;
    }


    /**
     * A lookup table of all valid timezones
     * @memberof bartificer
     * @inner
     * @private
     * @type {Object.<string, boolean>}
     */
    var timezoneLookup = {};
    moment.tz.names().forEach(function(tzName){
        timezoneLookup[tzName] = true;
    });

    /**
     * Test if a given value is a valid timezone.
     *
     * @memberof bartificer
     * @inner
     * @private
     * @param  {*} str The value to test.
     * @return {boolean} `true` if the test value is a valid timezone, `false`
     * otherwise.
     * @see timezone
     */
    function isTimezone(str){
        if(typeof str !== 'string'){
            return false;
        }
        if(str == 'LOCAL'){
            return true;
        }
        return timezoneLookup[str] ? true : false;
    }

    /**
     * Test if a given value is a boolean.
     *
     * @memberof bartificer
     * @inner
     * @private
     * @param  {*} b The value to test.
     * @return {boolean} `true` if the value is a boolean, `false` otherwise.
     */
    function isBoolean(b){
        return typeof b === 'boolean' ? true : false;
    }

    /**
     * Test if a given valu is a valid opacity (number between 0 and 1
     * inclusive).
     *
     * @memberof bartificer
     * @inner
     * @private
     * @param  {type} o The value to test
     * @return {boolean} `true` if the value is a valid opacity, `false`
     * otherwise
     * @see opacity
     */
    function isOpacity(o){
        if(typeof o !== 'number'){
            return false;
        }
        return o >= 0 && o <= 1 ? true : false;
    }

    //
    // === Define the bartificer.Worldclock Prototype
    //

    /**
     * A function to coerce any value to a Boolean. If the value is undefined
     * the default value is returned (forced to a boolean), otherwise, the
     * 'truthiness' of the value is returned.
     *
     * @memberof bartificer
     * @inner
     * @private
     * @param  {*} val The value to be coerced.
     * @param  {type} def The default value.
     * @return {boolean}
     */
    function coerceToBoolean(val, def){
        if(typeof val === 'undefined'){
            return def ? true : false;
        }
        return val ? true : false;
    }

    /**
     * An object containing metadata about each of the valid options a clock
     * can accept.
     *
     * The keys of the object are the names of the options, and each points to
     * another plain object indexed by the following values:
     *
     * * `description` - a string containing a description of the data expected
     *   for the option which will be used in error messages.
     * * `default` - the default value for the option.
     * * `validator` - a reference to a function that accepts one argument,
     *   and returns a boolean. The function will be used to test if values are
     *   valid for the option
     * * coerce - (OPTIONAL) a reference to a fucntion that will transform any
     *   value to a valid value for the option. Options that define a coercion
     *   will not trigger errors when an invalid value is passed. The function
     *   will be called with two arguments - the value to be coerced, and the
     *   default value for the option.
     * * `onChange` - (OPTIONAL) a reference to a function that will be called
     *   each time the option's value is set. When the function is called, the
     *   special this variable will be set to a reference to the clock object to
     *   which the option belongs, and the new value for the option will be
     *   passed as the first argument.
     *
     * A reference to the object representing the clock will be added to the
     * container as a the data attribute `data-bartificer-worldclock` (or
     * `bartificerWorldclock` from JavaScript's point of view).
     *
     * @memberof bartificer
     * @inner
     * @private
     * @type {plainObject}
     */
    var optionDetails = {
        animationTime: {
            description: 'the time animations should happen over in milliseconds - must be a number between 0 and 1,000 inclusive',
            default: 250,
            validator: function(aniTime){
                // make sure the animation time is a number
                if(typeof aniTime !== 'number'){
                    return false;
                }

                // make sure the animation time is an integer
                if(parseInt(aniTime) != aniTime){
                    return false;
                }

                // make sure the animation time is in the right range
                return aniTime >= 0 && aniTime <= 1000 ? true : false;
            }
        },
        fixedTime: {
            description: 'set the clock to spesific time. Object includes hour, minute, and (optional) second',
            default: null,
            validator: function(fixedTime){
                // make sure its empty or have all required parts
                if(!fixedTime){
                    return true;
                }

                else{
                    return fixedTime.hour < 24 && fixedTime.hour > -1 && !isNaN(fixedTime.hour) && fixedTime.minute > -1 && fixedTime.minute < 60 && !isNaN(fixedTime.minute) && (!fixedTime.second || !isNaN(fixedTime.second));
                }
            }
        },
        blinkSeparators: {
            description: "a boolean indicating whether or not to blink the separator(s)",
            default: true,
            validator: isBoolean,
            coercion: coerceToBoolean,
            onChange: function(newVal){
                if(!newVal){
                    this._$separatorHM.fadeTo(this._options.animationTime, this._options.separatorOnOpacity);
                    if(this._options.showSeconds){
                        this._$separatorMS.fadeTo(this._options.animationTime, this._options.separatorOnOpacity);
                    }else{
                        this._$separatorMS.css('opacity', this._options.separatorOnOpacity);
                    }
                }
            }
        },
        separatorOnOpacity: {
            description: "the opacity to use for a separator when it is 'on' as a number between 0 and 1 inclusive",
            default: 0.8,
            validator: isOpacity,
            onChange: function(newVal){
                if(!this._options.blinkSeparators){
                    this._$separatorHM.css('opacity', newVal);
                    this._$separatorMS.css('opacity', newVal);
                }
            }
        },
        separatorOffOpacity: {
            description: "the opacity to use for a separator when it is 'off' as a number between 0 and 1 inclusive",
            default: 0.2,
            validator: isOpacity
        },
        showAmpm: {
            description: "a boolean indicating whether or not to show the AM/PM if in 12 hour format",
            default: true,
            validator: isBoolean,
            coercion: coerceToBoolean,
            onChange: function(newVal){
                if(newVal && this._options.use12HourFormat){
                    this._$ampm.show(this._options.animationTime);
                }else{
                    this._$ampm.hide(this._options.animationTime);
                }
            }
        },
        showSeconds: {
            description: "a boolean indicating whether or not to show the seconds",
            default: false,
            validator: isBoolean,
            coercion: coerceToBoolean,
            onChange: function(newVal){
                if(newVal){
                    this._$separatorMS.show(this._options.animationTime);
                    this._$seconds.show(this._options.animationTime);
                }else{
                    this._$separatorMS.hide(this._options.animationTime);
                    this._$seconds.hide(this._options.animationTime);
                }
            }
        },
        timezone: {
            description: "the timezone for the clock as an IANA string, or, the special value 'LOCAL'",
            default: 'LOCAL',
            validator: isTimezone
        },
        use12HourFormat: {
            description: "whether or not to render the time in 12 hour format",
            default: false,
            validator: isBoolean,
            coercion: coerceToBoolean,
            onChange: function(newVal){
                if(newVal && this._options.showAmpm){
                    this._$ampm.show(this._options.animationTime);
                }else{
                    this._$ampm.hide(this._options.animationTime);
                }
            }
        }
    };

    //
    // -- the constructor --
    //

    /**
     * Transform an HTML element into a clock and build an object to represent
     * it.
     *
     * The container for the clock will have the CSS class
     * `bartificer-worldclock` added to it.
     *
     * The following elements will be added into the container:
     *
     * ```
     * <span class="bartificer-worldclock-hours"></span>
     * <span class="bartificer-worldclock-separator bartificer-worldclock-separator-hm"></span>
     * <span class="bartificer-worldclock-minutes">:</span>
     * <span class="bartificer-worldclock-separator bartificer-worldclock-separator-ms">:</span>
     * <span class="bartificer-worldclock-seconds"></span>
     * <span class="bartificer-worldclock-ampm"></span>
     * ```
     *
     * @constructor
     * @param  {jQuerySingleContainer} $container - A jQuery object representing
     * the element on the page that will be converted into the clock. Note that
     * this element will be emptied.
     * @param  {plainObject} [options={}] An optional plain object containing
     * configuration options. For each supported option, there is also a
     * matching data attribute which can be set on the container. Values passed
     * to the constructor take precedence over values specified with data
     * attributes.
     * @param {number} [options.animationTime=250] The time animations take
     * place over in milliseconds. Must be a whole number between 0 and 1,000
     * inclusive. (data attribute: `data-animation-time`)
     * @param {boolean} [options.blinkSeparators=true] Whether or not to blink
     * the separator(s) every second. (data attribute: `data-bink-separators`)
     * @param {opacity} [options.separatorOnOpacity=0.8] The opacity for
     * separators that are 'on'. (data attribute: `data-separator-on-opacity`)
     * @param {opacity} [options.separatorOffOpacity=0.2] The opacity for
     * separators that are 'off'. (data attribute: `data-separator-off-opacity`)
     * @param {boolean} [options.showAmpm=true] Whether or not to show the
     * AM/PM span when in 12 hour format (option `use12HourFormat` is `true`).
     * (data attribute: `data-show-ampm`)
     * @param {boolean} [options.showSeconds=false] Whether or not to show
     * seconds. (data attribute: `data-show-seconds`)
     * @param {timezone} [options.timezone='LOCAL'] The timezone for the clock.
     * (data attribute: `data-timezone`)
     * @param {boolean} [options.use12HourFormat=false] Whether or not to show
     * the time in 12 hour format. (data attribute: `data-use12-hour-format`)
     * @throws {TypeError} An error is thrown if the first argument is not
     * present and valid, and if the second argument is present but not valid.
     * @throws {Error} An error is thrown if the container has already been
     * initialised as a clock.
     * @example
     * // convert the HTML element with the ID clock1 into a world clock with
     * // all the default settings
     * var myClock = new bartificer.Worldclock($('#clock1'));
     *
     * // convert the HTML element with the ID clock2 into a world clock using
     * // the timezone Europe/Brussels and showing the seconds
     * var myOtherClock = new bartificer.Worldclock(
     *     $('#clock2'),
     *     {
     *         timezone: 'Europe/Brussels',
     *         showSeconds: true
     *     }
     * );
     */
    bartificer.Worldclock = function($container, options){
        // validate the arguments
        if(isJQuerySingleContainer($container)){

            /**
             * A reference to a jQuery boject representing the clock's container
             * @private
             * @type {jQuerySingleContainer}
             */
            this._$container = $container;
        }else{
            throw new TypeError('the first argument must be a reference to a jQuery object representing exactly one valid element which must be a span, div, paragraph, or heading');
        }
        if(typeof options === 'undefined'){
            options = {};
        }
        if(!isPlainObject(options)){
            throw new TypeError('if present, the second argument must be a plain object');
        }

        // prevent the same container being re-initialised
        if(this._$container.data('bartificerWorldclock') instanceof bartificer.Worldclock){
            throw new Error('this element has already been initialised as a clock, it cannot be re-initialised');
        }

        /**
         * The ID of the interval controlling the clock. When the clock is
         * stopped, the value will be set to 0.
         * @private
         * @type {number}
         */
        this._intervalID = 0;

        // create a reference to this for use in callbacks
        var self = this;

        // initialise all the options

        /**
         * A plain object holding the values for all the clock's options.
         * @private
         * @type {plainObject}
         */
        this._options = {};
        Object.keys(optionDetails).forEach(function(optName){
            // if a valid value was passed for the option, use it
            if(typeof options[optName] !== 'undefined'){
                if(optionDetails[optName].validator(options[optName])){
                    self._options[optName] = options[optName];
                }else{
                    // if there is a coercion defined, use it, otherwise,
                    // whine and leave blank so it can be filled in later
                    if(typeof optionDetails[optName].coercion === 'function'){
                        self._options[optName] = optionDetails[optName].coercion(options[optName], optionDetails[optName].default);
                    }else{
                        console.warn("ignoring invalid value for option '" + optName + "' passed to constructor (should be " + optionDetails[optName] + ")");
                    }
                }
            }

            // if no value was accepted from the constructor, check for a data attribute
            if(typeof self._options[optName] === 'undefined'){
                var valFromDataAttribute = self._$container.data(optName);
                if(typeof valFromDataAttribute !== 'undefined'){
                    if(optionDetails[optName].validator(valFromDataAttribute)){
                        self._options[optName] = valFromDataAttribute;
                    }else{
                        // if there is a coercion defined, use it, otherwise,
                        // whine and leave blank so it can be filled in later
                        if(typeof optionDetails[optName].coercion === 'function'){
                            self._options[optName] = optionDetails[optName].coercion(valFromDataAttribute, optionDetails[optName].default);
                        }else{
                            console.warn("ignoring invalid value for option '" + optName + "' from data attribute (should be " + optionDetails[optName] + ")");
                        }
                    }
                }
            }

            // if no value is stored for the option yet, use the default
            if(typeof self._options[optName] === 'undefined'){
                self._options[optName] = optionDetails[optName].default;
            }
        });

        // initialise the container
        this._$container.empty().hide().addClass('bartificer-worldclock');

        /**
         * A reference to a jQuery object representing the `span` for the hours.
         * @private
         * @type {jQuery}
         */
        this._$hours = $('<span />').addClass('bartificer-worldclock-hours');
        this._$hours.text('00');
        this._$container.append(this._$hours);

        /**
         * A reference to a jQuery object representing the `span` for the
         * separator between the hours and the minutes.
         * @private
         * @type {jQuery}
         */
        this._$separatorHM = $('<span />').addClass('bartificer-worldclock-separator bartificer-worldclock-separator-hm');
        this._$separatorHM.text(':');
        this._$container.append(this._$separatorHM);

        /**
         * A reference to a jQuery object representing the `span` for the
         * minutes.
         * @private
         * @type {jQuery}
         */
        this._$minutes = $('<span />').addClass('bartificer-worldclock-minutes');
        this._$minutes.text('00');
        this._$container.append(this._$minutes);

        /**
         * A reference to a jQuery object representing the `span` for the
         * separator between the minutes and the seconds.
         * @private
         * @type {jQuery}
         */
        this._$separatorMS = $('<span />').addClass('bartificer-worldclock-separator bartificer-worldclock-separator-ms');
        this._$separatorMS.text(':');
        this._$container.append(this._$separatorMS);

        /**
         * A reference to a jQuery object representing the `span` for the
         * seconds.
         * @private
         * @type {jQuery}
         */
        this._$seconds = $('<span />').addClass('bartificer-worldclock-seconds');
        this._$seconds.text('00');
        this._$container.append(this._$seconds);

        /**
         * A reference to a jQuery object representing the `span` for the
         * AM/PM display.
         * @private
         * @type {jQuery}
         */
        this._$ampm = $('<span />').addClass('bartificer-worldclock-ampm');
        this._$container.append(this._$ampm);

        // save a reference to the newly constructed object into the container
        this._$container.data('bartificerWorldclock', this);

        // call the onchange function on all options that have one
        Object.keys(optionDetails).forEach(function(optName){
            // if there is an onChange handler, call it
            if(typeof optionDetails[optName].onChange === 'function'){
                optionDetails[optName].onChange.call(self, self._options[optName]);
            }
        });

        // start the clock
        this._$container.show();
        this.start();
    };

    //
    // -- Accessor methods --
    //

    /**
     * Get a reference to a jQuery object representing the clock's container.
     *
     * For conveniece, this function is also available without the leading `$`
     * in the name.
     *
     * @return {jQuery}
     * @see bartificer.Worldclock#container
     * @example
     * // assume myClock is an object with the prototype bartificer.Worldclock
     *
     * // get a jQuery object representing the container containing myClock
     * var myJQueryObj = myClock.$container();
     *
     * // or
     * var myJQueryObj = myClock.container();
     */
    bartificer.Worldclock.prototype.$container = function(){
        return this._$container;
    };


    /**
     * A synonym for {@link bartificer.Worldclock#$container}.
     * @function
     * @see bartificer.Worldclock#$container
     */
    bartificer.Worldclock.prototype.container = bartificer.Worldclock.prototype.$container;

    /**
     * An accessor method for getting and setting the value of any option.
     *
     * @param  {string} optName  The name of the option for which the value
     * should be fetched or updated.
     * @param  {*} [optValue] An optional new value for the option.
     * @return {*|bartificer.Worldclock} If a single argument is passed, the
     * value for the specified option will be returned. If two arguments are
     * passed a reference to the calling object will be returned to facilitate
     * function chaining.
     * @throws {Error} If the first argument is not a valid option name as a
     * string, an error will be thrown. For details of all supported options,
     * see the documentation for the constructor.
     * @throws {TypeError} If two arguments are passed, and the second argument
     * is not a valid value for the option specified by the first argument an
     * error will be thrown.
     * @see bartificer.Worldclock
     * @example
     * // assume myClock is an object with the prototype bartificer.Worldclock
     *
     * // get the timezone from the clock myClock
     * var myClockTZ = myClock.option('timezone');
     *
     * // set the timezone on the clock myClock
     * myClock.option('timezone', 'Europe/London');
     *
     * // set the on and off opacities on the clock myClock (using function chanining)
     * myClock.option('separatorOnOpacity', 1).option('separatorOffOpacity', 0);
     */
    bartificer.Worldclock.prototype.option = function(optName, optValue){
        // make sure we got a valid option name
        if(typeof optName !== 'string'){
            throw new TypeError('the first argument must be a string');
        }
        if(typeof optionDetails[optName] !== 'object'){
            throw new Error("unknown option '" + optName + "'");
        }

        // if there is a second argument - deal with it
        if(arguments.length > 1){
            // try get to a usable new value
            var usableNewValue = undefined;
            if(optionDetails[optName].validator(optValue)){
                usableNewValue = optValue;
            }else{
                // if there is a coercion, use it
                if(typeof optionDetails[optName].coercion === 'function'){
                    usableNewValue = optionDetails[optName].coercion(optValue, optionDetails[optName].default);
                }
            }

            // throw an error if we did not find a usable new value
            if(typeof usableNewValue === 'undefined'){
                throw new TypeError("Invalid value for option '" + optName + "' (" + optionDetails[optName].description + ")");
            }

            // update the value and call the change handler if appropriate
            this._options[optName] = usableNewValue;
            if(typeof optionDetails[optName].onChange === 'function'){
                optionDetails[optName].onChange.call(this, usableNewValue);
            }

            // return a reference to self to facilitate function chaining
            return this;
        }

        // if we got here, we are a getter, so return the value for the option
        return this._options[optName];
    };

    /**
     * Get the current time in the clock's timezone as a MomentJS object.
     *
     * @return {Object} The current time as a MomentJS object.
     * @example
     * // assume myClock is an object with the prototype bartificer.Worldclock
     *
     * // get the current moment form myClock
     * var now = myClock.currentMoment();
     */
    bartificer.Worldclock.prototype.currentMoment = function(){
        var now = moment();
       
        if(this._options.timezone !== 'LOCAL'){
            now = now.tz(this._options.timezone);
        }
        if(this._options.fixedTime){
            now.set('hour', this._options.fixedTime.hour);
            now.set('minute', this._options.fixedTime.minute);
            now.set('second', this._options.fixedTime.second ?  this._options.fixedTime.second : 0);
        }   
        return now;
    };
    bartificer.Worldclock.prototype.fixClock = function(hour, minute, second){
        var fixedTime = {
            hour:parseInt(hour),
            minute:parseInt(minute)
        }
        if(second){
            fixedTime.second = parseInt(second);
        }
        this.option('fixedTime', fixedTime);
        this.start();
    }
    bartificer.Worldclock.prototype.releaseClock = function(){
        this.option('fixedTime', null);
        this.start();
    }
    /**
     * The current time in
     * [ISO 6801]{@link https://en.wikipedia.org/wiki/ISO_8601} format.
     *
     * @return {string}
     * @example
     * // assume myClock is an object with the prototype bartificer.Worldclock
     *
     * // save the current time to a string
     * var isoString = myClock.currentTime();
     */
    bartificer.Worldclock.prototype.currentTime = function(){
        return this.currentMoment().toISOString();
    };

    /**
     * Get the current time as a string in the same format as the clock itself.
     *
     * @return {string} The current time as a string.
     * @example
     * // assume myClock is an object with the prototype bartificer.Worldclock
     *
     * // save the current time to a string
     * var timeString = myClock.toString();
     */
    bartificer.Worldclock.prototype.toString = function(){
        var now = this.currentMoment();
        var ans = '';
        if(this._options.use12HourFormat){
            ans += now.format('h');
        }else{
            ans += now.format('HH');
        }
        ans += ':' + now.format('mm');
        if(this._options.showSeconds){
            ans += ':' + now.format('ss');
        }
        if(this._options.use12HourFormat && this._options.showAmpm){
            ans += now.format('A');
        }
        return ans;
    };

    //
    // -- Control Methods --
    //

    /**
     * A function to render the current time into a given clock.
     *
     * @memberof bartificer
     * @inner
     * @private
     * @param  {bartificer.Worldclock} clock The clock to render the time into.
     */
    function renderClock(clock){
        // build a moment object to represent the current time
        var now = clock.currentMoment();

        // render the various parts of the time
        if(clock._options.use12HourFormat){
            clock._$hours.text(now.format('h'));
        }else{
            clock._$hours.text(now.format('HH'));
        }
        clock._$minutes.text(now.format('mm'));
        clock._$seconds.text(now.format('ss'));
        clock._$ampm.text(now.format('A'));

        // deal with the blinking of the separators as needed
        if(clock._options.blinkSeparators){
            if(parseInt(now.format('ss')) % 2 == 0){
                clock._$separatorHM.fadeTo(clock._options.animationTime, clock._options.separatorOnOpacity);
                if(clock._options.showSeconds){
                    clock._$separatorMS.fadeTo(clock._options.animationTime, clock._options.separatorOnOpacity);
                }else{
                    clock._$separatorMS.css('opacity', clock._options.separatorOnOpacity);
                }
            }else{
                clock._$separatorHM.fadeTo(clock._options.animationTime, clock._options.separatorOffOpacity);
                if(clock._options.showSeconds){
                    clock._$separatorMS.fadeTo(clock._options.animationTime, clock._options.separatorOffOpacity);
                }else{
                    clock._$separatorMS.css('opacity', clock._options.separatorOffOpacity);
                }
            }
        }
    }


    /**
     * Start the clock running.
     *
     * @return {bartificer.Worldclock} A reference to the clock the function
     * was called on to facilitate function chaining.
     * @example
     * // assume myClock is an object with the prototype bartificer.Worldclock
     *
     * // start the clock
     * myClock.start();
     */
    bartificer.Worldclock.prototype.start = function(){
        // if the clock is already running, return immediately
        if(this._intervalID){
            return this;
        }

        // create a reference to this for use in callbacks
        var self = this;

        // start the clock running
        renderClock(self);
        this._intervalID = setInterval(
            function(){
                renderClock(self);
            },
            1000
        );

        return this;
    };

    /**
     * Stop the clock.
     *
     * @return {bartificer.Worldclock} A reference to the clock the function
     * was called on to facilitate function chaining.
     * @example
     * // assume myClock is an object with the prototype bartificer.Worldclock
     *
     * // stop the clock
     * myClock.stop();
     */
    bartificer.Worldclock.prototype.stop = function(){
        // if the clock is already stopped, return immediately
        if(this._intervalID === 0){
            return this;
        }

        //stop the clock
        clearInterval(this._intervalID);
        this._intervalID = 0;

        return this;
    };

    //
    // === Automation ===
    //

    /**
     * Search a given search space for valid container elements with a class of
     * `bartificer-worldclock-auto`, and call the `bartificer.Worldclock`
     * constructor on each one found to turn it into a clock. If no search space
     * is provided, the entire document is searched.
     *
     * Once a container has been initialised as a clock, the class
     * `bartificer-worldclock-auto` will be removed.
     *
     * @param  {jQuery} [$searchSpace=$(document)] A jQuery object representing the elements
     * to search within.
     * @param {plainObject} [options={}] A plain object containing options to pass
     * to the constructor.
     * @return {bartificer.Worldclock[]} An array containing references to all
     * the world clocks that were loaded (could be an empty array).
     * @throws {TypeError} An error is thrown if arguments are present but not
     * valid.
     * @example
     * // turn all valid elements with the class bartificer-worldclock-auto in
     * // the entire document into clocks with all the default settings
     * var createdClocks = bartificer.Worldclock.autoLoad();
     *
     * // turn all valid elements with the class bartificer-worldclock-auto
     * // contained within a div with the ID main_content into world clocks
     * // in 12 hour format showing AM or PM
     * var createdClocks = bartificer.Worldclock.autoLoad(
     *     $('div.main_content'),
     *     {
     *         use12HourFormat: true,
     *         showAmpm: true
     *     }
     * );
     */
    bartificer.Worldclock.autoLoad = function($searchSpace, options){
        // validate the arguments
        if(typeof $serachSpace === 'undefined'){
            $searchSpace = $(document);
        }else{
            if(!($searchSpace instanceof $)){
                throw new TypeError('if present, the first argument must be a jQuery object');
            }
        }
        if(typeof options === 'undefined'){
            options = {};
        }else{
            if(!isPlainObject(options)){
                throw new TypeError('if present, the second argument must be a plain object');
            }
        }

        // carry out the search
        var ans = [];
        $('span, div, p, h1, h2, h3, h4, h5, h6', $searchSpace).filter('.bartificer-worldclock-auto').each(function(){
            var $container = $(this);
            ans.push(new bartificer.Worldclock($container, options));
            $container.removeClass('bartificer-worldclock-auto');
        });
        return ans;
    };


    /**
     * A flag to indicate that the automatic loading of clocks when the DOM
     * becomes ready should be suppressed.
     * @memberof bartificer
     * @inner
     * @private
     * @type {boolean}
     */
    var doSuppressAutoLoading = false;

    /**
     * A function to flag that the automatic loading of clocks into valid
     * elements with the class `bartificer-worldclock-auto` when the DOM becomes
     * ready should be suppressed.
     *
     * To have an effect, this function must be called after the API is loaded
     * (or it will not exist), but before the DOM has finished loading.
     * @example
     * <!-- Load the bartificer.Worldclock API -->
     * <script src="bartificer.worldclock.js"></script>
     *
     * <!-- Prevent automatic loading of clocks -->
     * <script>
     *   bartificer.Worldclock.suppressAutoLoading();
     * </script>
     */
    bartificer.Worldclock.suppressAutoLoading = function(){
        doSuppressAutoLoading = true;
    };

    //
    // -- Add a DOM ready event handler to auto-load clocks on page load
    //
    $(function(){
        if(!doSuppressAutoLoading){
            bartificer.Worldclock.autoLoad();
        }
    });
})(bartificer, jQuery);
