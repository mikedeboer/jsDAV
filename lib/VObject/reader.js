/*
 * @package jsDAV
 * @subpackage VObject
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsVObject_Component = require("./component");
var jsVObject_Parameter = require("./parameter");
var jsVObject_Property = require("./property");

var Base = require("./../shared/base");
var Exc = require("./../shared/exceptions");
var Util = require("./../shared/util");

/**
 * VCALENDAR/VCARD reader
 *
 * This class reads the vobject file, and returns a full element tree.
 */
var jsVObject_Reader = module.exports = Base.extend({
    /**
     * If this option is passed to the reader, it will be less strict about the
     * validity of the lines.
     *
     * Currently using this option just means, that it will accept underscores
     * in property names.
     */
    OPTION_FORGIVING: 1,

    /**
     * If this option is turned on, any lines we cannot parse will be ignored
     * by the reader.
     */
    OPTION_IGNORE_INVALID_LINES: 2,

    /**
     * Parses the file and returns the top component
     *
     * The options argument is a bitfield. Pass any of the OPTIONS constant to
     * alter the parsers' behaviour.
     *
     * @param {String} data
     * @param {Number} options
     * @return Node
     */
    read: function(data, options) {
        options = options || 0;
        // Normalizing newlines
        data = data.replace(/(\r|\n\n)/g, "\n");

        var lines = data.split(/\n/);

        // Unfolding lines
        var lines2 = [];
        for (var line, i = 0, l = lines.length; i < l; ++i) {
            line = lines[i];
            // Skipping empty lines
            if (!line)
                continue;

            if (line.charAt(0) === " " || line.charAt(0) === "\t")
                lines2[lines2.length - 1] += line.substr(1);
            else
                lines2.push(line);
        }

        this.lines = lines2;
        this.currentLine = 0;

        return this.readLine(lines2, options);
    },

    /**
     * Reads and parses a single line.
     *
     * This method receives the full array of lines. The array pointer is used
     * to traverse.
     *
     * This method returns null if an invalid line was encountered, and the
     * IGNORE_INVALID_LINES option was turned on.
     *
     * @param {Array} lines
     * @param {Number} options See the OPTIONS constants.
     * @return Node
     */
    readLine: function(lines, options) {
        options = options || 0;
        var line = lines[this.currentLine || 0];
        var lineNr = this.currentLine;
        ++this.currentLine;

        var obj;
        // Components
        if (line.substr(0, 6).toUpperCase() == "BEGIN:") {
            var componentName = line.substr(6).toUpperCase();
            obj = jsVObject_Component.create(componentName);

            var nextLine = lines[this.currentLine];

            var parsedLine;
            while (nextLine.substr(0,4).toUpperCase() != "END:") {
                parsedLine = this.readLine(lines, options);
                nextLine = lines[this.currentLine];

                if (!parsedLine)
                    continue;
                obj.add(parsedLine);

                if (!nextLine)
                    throw new SyntaxError("Invalid VObject. Document ended prematurely.");
            }

            // Checking component name of the 'END:' line.
            if (nextLine.substr(4) !== obj.name)
                throw new SyntaxError("Invalid VObject, expected: 'END:" + obj.name + "' got: '" + nextLine + "'");

            ++this.currentLine;

            return obj;
        }

        // Properties
        //result = preg_match('/(?P<name>[A-Z0-9-]+)(?:;(?P<parameters>^(?<!:):))(.*)/',line,matches);

        var token = options & this.OPTION_FORGIVING
            ? "[A-Z0-9-\\._]+"
            : "[A-Z0-9-\\.]+"
        //var parameters = "(?:;(?P<parameters>([^:^\"]|\"([^\"]*)\")*))?";
        var parameters = "(?:;((?:[^:^\"]|\"(?:[^\"]*)\")*))?";
        //regex = "/^(?P<name>token)parameters:(?P<value>.*)/i";
        var regex = "^(" + token + ")" + parameters + ":(.*)";

        //result = preg_match(regex,line,matches);
        var matches = line.match(new RegExp(regex, "i"));
        if (!matches) {
            if (options & this.OPTION_IGNORE_INVALID_LINES)
                return null;
            else
                throw new SyntaxError("Invalid VObject, line " + (lineNr + 1) + " did not follow the icalendar/vcard format");
        }

        var propertyName = matches[1];
        var propertyValue = matches[matches.length - 1].replace(/(\\\\(\\\\|N|n))/g, function(m, full, denote) {
            if (denote == "n" || denote == "N")
                return "\n";
            else
                return denote;
        });

        obj = jsVObject_Property.create(propertyName, propertyValue);

        if (matches.length === 4 && matches[2]) {
            this.readParameters(matches[2]).forEach(function(param) {
                obj.add(param);
            });
        }

        return obj;
    },

    /**
     * Reads a parameter list from a property
     *
     * This method returns an array of Parameter
     *
     * @param {String} parameters
     * @return array
     */
    readParameters: function(parameters) {
        var token = "[A-Z0-9-]+";
        var paramValue = '([^\"^;]*|"[^"]*")';
        //$regex = "/(?<=^|;)(?P<paramName>$token)(=$paramValue(?=$|;))?/i";
        var regex = "(" + token + ")(=" + paramValue + ")?";

        var params = [];
        parameters.replace(new RegExp(regex, "gi"), function(m, paramName, param, paramValue, sfx) {
            var value = paramValue ? paramValue : null;

            if (value && value.charAt(0)) {
                // Stripping quotes, if needed
                if (value.charAt(0) === '"')
                    value = value.substr(1, value.length - 2);
            }
            else
                value = "";

            value = value.replace(/(\\\\(\\\\|N|n))/g, function(m, full, denote) {
                if (denote == "n" || denote == "N")
                    return "\n";
                else
                    return denote;
            });

            params.push(jsVObject_Parameter.new(paramName, value));
        });

        return params;
    }
});
