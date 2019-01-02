const _ = require('lodash');
const { jsonSearch, resolveLocal } = require('./json-reference');

const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'];

module.exports = function specFilter(options, specData) {
    let specCopy = _.cloneDeep(specData);

    if(options.removeHidden) {
        if(specCopy.tags) {
            specCopy.tags = _.filter(specCopy.tags, function(tag) {
                return !tag['x-spectacle-hide'];
            });
        }

	    let refs = findRefs(specCopy, specCopy.paths);

	    if(specCopy.definitions) {
		    specCopy.definitions = _.pickBy(specCopy.definitions, function(def, defName) {
			    return refs.has(`#/definitions/${defName}`) && !def['x-spectacle-hide'];
		    });
	    }


	    if(specCopy.parameters) {
		    specCopy.parameters = _.pickBy(specCopy.parameters, function(param, paramName) {
			    return refs.has(`#/parameters/${paramName}`) && !param['x-spectacle-hide'];
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
                        continue;
                    }
                    if(path[method]){
                        if(path[method].hasOwnProperty('parameters'))
                        {
	                        path[method]['parameters'] = _.filter(path[method]['parameters'], function(parameter) {
		                            if(parameter.hasOwnProperty('$ref')){
                                        const parametersRegex = /^(?:#\/parameters\/)(.*)$/;
                                        const definitionsRegex = /^(?:#\/definitions\/)(.*)$/;
                                        let m;

                                        if ((m = parametersRegex.exec(parameter.$ref)) !== null) {
                                            return specCopy.parameters.hasOwnProperty(m[1]);
                                        }
                                        if ((m = definitionsRegex.exec(parameter.$ref)) !== null) {
                                            return specCopy.definitions.hasOwnProperty(m[1]);
                                        }
                                        return false;
                                    }
		                        return true;
	                        });
                        }
                    }
                }

                return METHODS.some(function(method) {
                    return Boolean(path[method]);
                });
            });


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
