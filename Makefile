.PHONY: default
default: lint test

.PHONY: lint
lint: node_modules
	./node_modules/.bin/jshint examples/ lib/ test/

node_modules:
	npm install

.PHONY: test
test: node_modules test-mocha
	node test/test_base.js

# TODO: test/test_ftp.js and test/test_xml.js need to be resurrected.
.PHONY: test-mocha
test-mocha: node_modules
	./node_modules/.bin/mocha \
		test/test_codesearch.js \
		test/test_filelist.js
