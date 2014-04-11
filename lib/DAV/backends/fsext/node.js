/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_FS_Node = require("./../fs/node");
var jsDAV_iProperties = require("./../../interfaces/iProperties");

var Fs = require("fs");
var Path = require("path");
var Exc = require("./../../../shared/exceptions");
var Util = require("./../../../shared/util");

var jsDAV_FSExt_Node = module.exports = jsDAV_iProperties.extend(jsDAV_FS_Node, {
    PROPS_DIR: ".jsdav",

    /**
     * Updates properties on this node,
     *
     * @param array properties
     * @see jsDAV_iProperties#updateProperties
     * @return bool|array
     */
    updateProperties: function(properties, cbupdateprops) {
        var self = this;
        this.getResourceData(function(err, resourceData) {
            if (err)
                return cbupdateprops(err);

            var propertyName, propertyValue
            for (propertyName in properties) {
                propertyValue = properties[propertyName];
                // If it was null, we need to delete the property
                if (!propertyValue) {
                    if (typeof resourceData[propertyName] != "undefined")
                        delete resourceData[propertyName];
                } else {
                    resourceData[propertyName] = propertyValue;
                }

            }

            self.putResourceData(resourceData, function(err) {
                cbupdateprops(err, !err);
            });
        });
    },

    /**
     * Returns a list of properties for this nodes.;
     *
     * The properties list is a list of propertynames the client requested,
     * encoded as xmlnamespace#tagName, for example: http://www.example.org/namespace#author
     * If the array is empty, all properties should be returned
     *
     * @param array properties
     * @return array
     */
    getProperties: function(properties, cbgetprops) {
        this.getResourceData(function(err, resourceData) {
            if (err)
                return cbgetprops(err);

            // If the array was empty, we need to return everything
            if (!properties || !properties.length)
                return resourceData;

            var props = {};
            properties.forEach(function(property) {
                if (resourceData[property])
                    props[property] = resourceData[property];
            });

            cbgetprops(null, props);
        });
    },

    /**
     * Returns the path to the resource file
     *
     * @return string
     */
    getResourceInfoPath: function() {
        var parentDir = Util.splitPath(this.path)[0];
        return Path.join(parentDir, this.PROPS_DIR);
    },

    getResourceJson: function(cbgetresjson) {
        var path = this.getResourceInfoPath();
        var self = this;

        Fs.exists(path, function(exists) {
            if (!exists)
                return cbgetresjson();

            Fs.readFile(path, {encoding: "utf8"}, function(err, data) {
                if (err)
                    return cbgetresjson(err);

                try {
                    data = JSON.parse(data);
                } catch (ex) {
                    return cbgetresjson();
                }
                cbgetresjson(null, data);
            });
        });
    },

    /**
     * Returns all the stored resource information
     *
     * @return array
     */
    getResourceData: function(cbgetresdata) {
        var empty = {};

        var self = this;
        this.getResourceJson(function(err, data) {
            if (err)
                return cbgetresdata(err);
            if (!data)
                return cbgetresdata(null, empty);

            data = data[self.getName()];
            if (!data || !Object.keys(data).length)
                return cbgetresdata(null, empty);

            cbgetresdata(null, data);
        });
    },

    /**
     * Updates the resource information
     *
     * @param array newData
     * @return void
     */
    putResourceData: function(newData, cbputresdata) {
        var path = this.getResourceInfoPath();
        var self = this;
        this.getResourceJson(function(err, data) {
            if (err)
                return cbputresdata(err);

            if (!data)
                data = {};
            data[self.getName()] = newData;
            Fs.writeFile(path, JSON.stringify(data), {encoding: "utf8"}, cbputresdata);
        });
    },

    /**
     * Renames the node
     *
     * @param string name The new name
     * @return void
     */
    setName: function(name, cbfssetname) {
        var parentPath = Util.splitPath(this.path)[0];
        var newName    = Util.splitPath(name)[1];

        var newPath = Path.join(parentPath, newName);
        var self = this;
        this.getResourceData(function(err, data) {
            if (err)
                return cbfssetname(err);

            self.deleteResourceData(function(err) {
                if (err)
                    return cbfssetname(err);

                Fs.rename(self.path, newPath, function(err) {
                    if (err)
                        return cbfssetname(err);
                    self.path = newPath;
                    self.putResourceData(data, cbfssetname);
                });
            });
        });
    },

    /**
     * @return bool
     */
    deleteResourceData: function(cbdelresdata) {
        // When we're deleting this node, we also need to delete any resource
        // information
        var path = this.getResourceInfoPath();
        var self = this;
        this.getResourceJson(function(err, data) {
            if (err)
                return cbdelresdata(err);
            if (!data)
                return cbdelresdata();

            if (data[self.getName()])
                delete data[self.getName()];
            Fs.writeFile(path, JSON.stringify(data), {encoding: "utf8"}, cbdelresdata);
        });
    }
});
