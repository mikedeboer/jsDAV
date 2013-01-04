/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax.org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Util   = require("./../lib/shared/util"),
    Assert = require("assert"),
    K      = function() {},

    onStartDocument = K,
    onEndDocument = K,
    onStartElementNS = K,
    onEndElementNS = K,
    onCharacters = K,
    onCdata = K,
    onComment = K,
    onWarning = K,
    onError = K;

function setUp() {
    return new Xml.SaxParser(function(cb) {
        cb.onStartDocument(function() {
            onStartDocument();
        });
        cb.onEndDocument(function() {
            onEndDocument();
        });
        cb.onStartElementNS(function(elem, attrs, prefix, uri, namespaces) {
            console.log("=> Started: " + elem + " uri="+uri +" (Attributes: " + JSON.stringify(attrs) + " )");
            onStartElementNS(elem, attrs, prefix, uri, namespaces);
        });
        cb.onEndElementNS(function(elem, prefix, uri) {
            console.log("<= End: " + elem + " uri="+uri + "\n");
            onEndElementNS(elem, prefix, uri);
            parser.pause();// pause the parser
            setTimeout(function (){parser.resume();}, 100); //resume the parser
        });
        cb.onCharacters(function(chars) {
            console.log('<CHARS>'+chars+"</CHARS>");
            onCharacters(chars);
        });
        cb.onCdata(function(cdata) {
            console.log('<CDATA>'+cdata+"</CDATA>");
            onCdata(cdata);
        });
        cb.onComment(function(msg) {
            console.log('<COMMENT>'+msg+"</COMMENT>");
            onComment(msg);
        });
        cb.onWarning(function(msg) {
            console.log('<WARNING>'+msg+"</WARNING>");
            onWarning(msg);
        });
        cb.onError(function(msg) {
            console.log('<ERROR>'+JSON.stringify(msg)+"</ERROR>");
            onError(msg);
        });
    });
}

function result(sName, bTest) {

}

var Tests = {
    "testToClarkNotation": function() {
        var parser = setUp();
        onStartElementNS = function(elem, attrs, prefix, uri, namespaces) {
            result("testToClarkNotation", Assert.equal(
                '{http://www.example.org/}test1',
                Util.toClarkNotation(uri, elem)
            ));
            onStartElementNS = K;
        }

        parser.parseString('<?xml version="1.0"?><test1 xmlns="http://www.example.org/">Testdoc</test1>');
    },

    "testToClarkNotation2": function() {
        var parser = setUp();
        onStartElementNS = function(elem, attrs, prefix, uri, namespaces) {
            result("testToClarkNotation", Assert.equal(
                '{http://www.example.org/}test1',
                Util.toClarkNotation(uri, elem)
            ));
            onStartElementNS = K;
        }

        parser.parseString('<?xml version="1.0"?><s:test1 xmlns:s="http://www.example.org/">Testdoc</s:test1>');
    },

    "testToClarkNotationDAVNamespace": function() {
        var parser = setUp();
        onStartElementNS = function(elem, attrs, prefix, uri, namespaces) {
            result("testToClarkNotation", Assert.equal(
                '{DAV:}test1',
                Util.toClarkNotation(uri, elem)
            ));
            onStartElementNS = K;
        }
        parser.parseString('<?xml version="1.0"?><s:test1 xmlns:s="urn:DAV">Testdoc</s:test1>');
    },

    /*"testToClarkNotationNoElem": function() {

        parser.parseString('<?xml version="1.0"?><s:test1 xmlns:s="urn:DAV">Testdoc</s:test1>');

        return Assert.equal(
            Util.toClarkNotation(dom.firstChild.firstChild),
            null
        )
    },*/

    "testConvertDAVNamespace": function() {
        var parser = setUp();
        parser.parseString('<?xml version="1.0"?><document xmlns="DAV:">blablabla</document>');
        /*return Assert.equal(
            '<?xml version="1.0"?><document xmlns="urn:DAV">blablabla</document>',
            Util.convertDAVNamespace(xml)
        )*/
        return true;
    },

    "testConvertDAVNamespace2": function() {
        var parser = setUp();
        parser.parseString('<?xml version="1.0"?><s:document xmlns:s="DAV:">blablabla</s:document>');
        /*/*return Assert.equal(
            '<?xml version="1.0"?><s:document xmlns:s="urn:DAV">blablabla</s:document>',
            Util.convertDAVNamespace(xml)
        )*/
        return true;
    },

    "testConvertDAVNamespace3": function() {
        var parser = setUp();
        parser.parseString('<?xml version="1.0"?><s:document xmlns="http://bla" xmlns:s="DAV:" xmlns:z="http://othernamespace">blablabla</s:document>');
        /*return Assert.equal(
            '<?xml version="1.0"?><s:document xmlns="http://bla" xmlns:s="urn:DAV" xmlns:z="http://othernamespace">blablabla</s:document>',
            Util.convertDAVNamespace(xml)
        )*/
        return true;
    },

    "testConvertDAVNamespace4": function() {
        xml='<?xml version="1.0"?><document xmlns=\'DAV:\'>blablabla</document>';
        /*return Assert.equal(
            '<?xml version="1.0"?><document xmlns=\'urn:DAV\'>blablabla</document>',
            Util.convertDAVNamespace(xml)
        )*/
        return true;
    },

    "testConvertDAVNamespaceMixedQuotes": function() {
        xml='<?xml version="1.0"?><document xmlns=\'DAV:" xmlns="Another attribute\'>blablabla</document>';
        /*return Assert.equal(
            xml,
            Util.convertDAVNamespace(xml)
        )*/
        return true;
    },

    /**
     * @depends testConvertDAVNamespace
     *
    "testLoadDOMDocument": function() {
        parser.parseString('<?xml version="1.0"?><document></document>');
        //dom = Util.loadDOMDocument(xml);
        /*return Assert.ok(dom instanceof DOMDocument)
        return true;
    },

    /**
     * @depends testLoadDOMDocument
     * @expectedException Sabre_DAV_Exception_BadRequest
     *
    "testLoadDOMDocumentEmpty": function() {
        //Util.loadDOMDocument('');
        return true;
    },*/

    /**
     * @depends testConvertDAVNamespace
     * @expectedException Sabre_DAV_Exception_BadRequest
     */
    "testLoadDOMDocumentInvalid": function() {
        parser.parseString('<?xml version="1.0"?><document></docu');
        //dom = Util.loadDOMDocument(xml);
        return true;
    },

    /**
     * @depends testLoadDOMDocument
     *
    "testLoadDOMDocumentUTF16": function() {
        parser.parseString('<?xml version="1.0" encoding="UTF-16"?><root xmlns="DAV:">blabla</root>');
        xml = iconv('UTF-8','UTF-16LE',xml);
        dom = Util.loadDOMDocument(xml);
        return Assert.equal('blabla',dom.firstChild.nodeValue)
    }
    */

    "testParseProperties": function() {
        parser.parseString('<?xml version="1.0"?>\
<root xmlns="DAV:">\
<prop>\
<displayname>Calendars</displayname>\
</prop>\
</root>');

        //dom = Util.loadDOMDocument(xml);
        //properties = Util.parseProperties(dom.firstChild);

        /*return Assert.equal({
            '{DAV:}displayname' : 'Calendars'
        }, properties)*/
        return true;
    },

    /**
     * @depends testParseProperties
     */
    "testParsePropertiesEmpty": function() {
        parser.parseString('<?xml version="1.0"?>\
<root xmlns="DAV:" xmlns:s="http://www.rooftopsolutions.nl/example">\
<prop>\
<displayname>Calendars</displayname>\
</prop>\
<prop>\
<s:example />\
</prop>  \
</root>');

        //dom = Util.loadDOMDocument(xml);
        //properties = Util.parseProperties(dom.firstChild);

        /*return Assert.equal({
            '{DAV:}displayname' : 'Calendars',
            '{http://www.rooftopsolutions.nl/example}example' : null
        }, properties)*/
        return true;
    },


    /**
     * @depends testParseProperties
     */
    "testParsePropertiesComplex": function() {
        parser.parseString('<?xml version="1.0"?>\
<root xmlns="DAV:">\
<prop>\
<displayname>Calendars</displayname>\
</prop>\
<prop>\
<someprop>Complex value <b>right here</b></someprop>\
</prop>\
</root>');

        //dom = Util.loadDOMDocument(xml);
        //properties = Util.parseProperties(dom.firstChild);

        /*return Assert.equal({
            '{DAV:}displayname' : 'Calendars',
            '{DAV:}someprop'    : 'Complex value right here'
        }, properties)*/
        return true;
    },


    /**
     * @depends testParseProperties
     */
    "testParsePropertiesNoProperties": function() {
        parser.parseString('<?xml version="1.0"?>\
<root xmlns="DAV:">\
<prop>\
</prop>\
</root>');

        //dom = Util.loadDOMDocument(xml);
        //properties = Util.parseProperties(dom.firstChild);

        /*return Assert.equal(array(), properties)*/
        return true;
    },

    "testParsePropertiesMapHref": function() {
        parser.parseString('<?xml version="1.0"?>\
<root xmlns="DAV:">\
<prop>\
<displayname>Calendars</displayname>\
</prop>\
<prop>\
<someprop><href>http://sabredav.org/</href></someprop>\
</prop>\
</root>');

        //dom = Util.loadDOMDocument(xml);
        //properties = Util.parseProperties(dom.firstChild, {'{DAV:}someprop':'Sabre_DAV_Property_Href'});

        /*return Assert.equal({
            '{DAV:}displayname' : 'Calendars',
            '{DAV:}someprop'    : new Sabre_DAV_Property_Href('http://sabredav.org/',false)
        }, properties)*/
        return true;
    }
};
var count = 0, max = 5;
for (var test in Tests) {
    ++count;
    Tests[test]();
    console.log(count + " " + test + " executed.");
    if (count >= max)
        break;
}
