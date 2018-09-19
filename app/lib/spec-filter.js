const _ = require('lodash');
const { jsonSearch } = require('./json-reference');

const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'];

module.exports = function specFilter(options, specData) {
    let specCopy = _.cloneDeep(specData);

    if(options.removeHidden) {
        if(specCopy.tags) {
            specCopy.tags = _.filter(specCopy.tags, function(tag) {
                return !tag['x-spectacle-hide'];
            });
        }

        if(specCopy.paths) {
            specCopy.paths = _.pickBy(specCopy.paths, function(path) {
                if(path['x-spectacle-hide']) {
                    return false;
                }

                for(let method of METHODS) {
                    if(path[method] && path[method]['x-spectacle-hide']) {
                        delete path[method];
                    }
                }

                return METHODS.some(function(method) {
                    return Boolean(path[method]);
                });
            });

            let refs = findRefs(specCopy, specCopy.paths);

            if(specCopy.definitions) {
                specCopy.definitions = _.pickBy(specCopy.definitions, function(def, defName) {
                    return refs.has(`#/definitions/${defName}`);
                });
            }

            if(specCopy.parameters) {
                specCopy.parameters = _.pickBy(specCopy.parameters, function(param, paramName) {
                    return refs.has(`#/parameters/${paramName}`);
                });
            }
        }
    }

    return specCopy;
};


function findRefs(apiDoc, object, refs = new Set()) {
    for(let [prop, propValue] of Object.entries(object)) {
        if(prop === '$ref') {
            let ref = propValue;

            if( !refs.has(ref) ) {
                let refTarget = jsonSearch(ref, apiDoc);
                refs.add(ref);
                findRefs(apiDoc, refTarget, refs);
            }
        } else if(typeof propValue === 'object') {
            findRefs(apiDoc, propValue, refs);
        }
    }

    return refs;
}
