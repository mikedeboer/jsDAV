# jsDAV

jsDAV allows you to easily add WebDAV support to a NodeJS application.
jsDAV is meant to cover the entire standard, and attempts to allow integration using an easy to understand API.

## SabreDAV
jsDAV started as a port of [SabreDAV] to NodeJS Javascript, written by Evert Pot
and maintained by Evert and contributors.
[SabreDAV] is regarded as one of the highest quality WebDAV implementations around
and is written entirely in PHP and is the most feature complete implementation
that I've seen to date. I am watching the [SabreDAV] repository closely for changes,
improvements and bugfixes, to see if they can be ported to jsDAV.

## Features

 * Fully WebDAV compliant
 * Supports Windows XP, Windows Vista, Mac OS/X, DavFSv2, Cadaver, Netdrive, Open Office, and probably more
 * Supporting class 1, 2 and 3 Webdav servers
 * Custom property support
 * Locking support
 * Pass all Litmus tests

## Features in development

 * CalDAV (to be tested with Evolution, iCal, iPhone and Lightning).

## Supported RFC's

 * [RFC2617]: Basic/Digest auth
 * [RFC2518]: First WebDAV spec
 * [RFC4709]: DavMount
 * [RFC5397]: current-user-principal
 * [RFC5689]: Extended MKCOL
 * [RFC3744]: ACL
 * CardDAV (to be tested with the iOS addressbook and Evolution)

## RFC's in development

 * [RFC4791]: CalDAV
 * [RFC4918]: WebDAV revision
 * CalDAV ctag, CalDAV-proxy

[SabreDAV]: http://sabre.io/
[RFC2617]: http://www.ietf.org/rfc/rfc2617.txt
[RFC2518]: http://www.ietf.org/rfc/rfc2518.txt
[RFC3744]: http://www.ietf.org/rfc/rfc3744.txt
[RFC4709]: http://www.ietf.org/rfc/rfc4709.txt
[RFC4791]: http://www.ietf.org/rfc/rfc4791.txt
[RFC4918]: http://www.ietf.org/rfc/rfc4918.txt
[RFC5397]: http://www.ietf.org/rfc/rfc5397.txt
[RFC5689]: http://www.ietf.org/rfc/rfc5689.txt

See the [wiki](https://github.com/mikedeboer/jsDAV/wiki) for more information or
ask a question in the [mailing list](https://groups.google.com/d/forum/jsdav)!


Amsterdam, 2010. Mike de Boer.
