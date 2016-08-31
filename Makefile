GIT_ROOT := $(shell git rev-parse --show-toplevel 2>/dev/null)

PATH := $(GIT_ROOT)/node_modules/.bin:$(PATH)
export PATH

WHICH := 2>/dev/null which
ESLINT = $(shell PATH="$(PATH)" $(WHICH) eslint || echo "ESLINT_NOT_FOUND") --max-warnings 0
ISTANBUL = $(shell PATH="$(PATH)" $(WHICH) istanbul || echo "ISTANBUL_NOT_FOUND")
MOCHA = $(shell PATH="$(PATH)" $(WHICH) _mocha || echo "MOCHA_NOT_FOUND")
AWS_CLI = $(shell PATH="$(PATH)" $(WHICH) aws || echo "AWS_NOT_FOUND")

COVERAGE_EXCLUDE = "-x _scripts/**/*" -x "web/**/*"
GIT_NUKE_EXCLUDE = -e "/.idea"

.PHONY: default
default: all


.PHONE: deps
deps:
	npm install


.PHONY: test
test: deps lint coverage


.PHONY: lint
lint: deps
	$(ESLINT) lib tests


.PHONY: deps unit
unit: test-unit


.PHONY: test-unit
test-unit: deps
	NODE_ENV=TEST $(MOCHA) ./tests/unit --recursive


.PHONY: coverage
coverage: deps
	NODE_ENV=TEST $(ISTANBUL) cover --include-all-sources true $(COVERAGE_EXCLUDE) $(MOCHA) ./tests/unit -- --recursive
	NODE_ENV=TEST $(ISTANBUL) check-coverage --statement 100 --branches 100 --functions 100 --lines 100


.PHONY: package
package: clean deps test
	npm prune --production
	rm -rf package.zip
	zip package.zip -r node_modules src package.json


.PHONY: all
all: clean deps test


.PHONY: clean
clean:
	rm -rf node_modules coverage npm-debug.log *.zip


.PHONY: nuke
nuke:
	git clean -xdf $(GIT_NUKE_EXCLUDE) .
	git checkout .
