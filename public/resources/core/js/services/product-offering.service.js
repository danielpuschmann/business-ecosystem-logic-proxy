/* Copyright (c) 2015 - 2017 CoNWeT Lab., Universidad Politécnica de Madrid
 *
 * This file belongs to the bae-logic-proxy-test of the
 * Business API Ecosystem
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @author Francisco de la Vega <fdelavega@conwet.com>
 *         Jaime Pajuelo <jpajuelo@conwet.com>
 *         Aitor Magán <amagan@conwet.com>
 */

(function () {

    'use strict';

    angular
        .module('app')
        .factory('Offering', ['$q', '$resource', 'URLS', 'LIFECYCLE_STATUS', 'User', 'ProductSpec', 'Category', ProductOfferingService]);

    function ProductOfferingService($q, $resource, URLS, LIFECYCLE_STATUS, User, ProductSpec, Category) {
        var resource = $resource(URLS.CATALOGUE_MANAGEMENT + '/:catalogue/:catalogueId/productOffering/:offeringId', {
            offeringId: '@id'
        }, {
            update: {method: 'PATCH'}
        });

        resource.prototype.formatCheapestPricePlan = formatCheapestPricePlan;
        resource.prototype.getCategories = getCategories;
        resource.prototype.getPicture = getPicture;
        resource.prototype.serialize = serialize;
        resource.prototype.appendPricePlan = appendPricePlan;
        resource.prototype.updatePricePlan = updatePricePlan;
        resource.prototype.removePricePlan = removePricePlan;
        resource.prototype.relationshipOf = relationshipOf;
        resource.prototype.relationships = relationships;

        var PATCHABLE_ATTRS = ['description', 'lifecycleStatus', 'name', 'version'];

        var EVENTS = {
            PRICEPLAN_UPDATE: '$pricePlanUpdate',
            PRICEPLAN_UPDATED: '$pricePlanUpdated'
        };

        var TYPES = {
            CHARGE_PERIOD: {
                MONTHLY: 'monthly',
                WEEKLY: 'weekly',
                YEARLY: 'yearly'
            },
            CURRENCY_CODE: {
                CAD: 'canadian dollar',
                EUR: 'euro',
                USD: 'us dollar'
            },
            PRICE: {
                ONE_TIME: 'one time',
                RECURRING: 'recurring',
                USAGE: 'usage'
            }
        };

        var exclusivities = [{name:'Exclusive'}, {name:'Unlimited'}];
        var sectors = [{name:'All sectors'}, {name:'Aerospace industry'}, {name:'Agriculture'}, {name:'Chemical industry'},
                       {name:'Computer industry'}, {name:'Construction industry'}, {name:'Defense industry'},
                       {name:'Education industry'}, {name:'Entertainment industry'}, {name:'Financial industry'},
                       {name:'Food industry'}, {name:'Health care industry'}, {name:'Hospitality industry'},
                       {name:'Information industry'}, {name:'Manufacturing'}, {name:'Mass media'},
                       {name:'Telecommunications industry'}, {name:'Transport industry'}, {name:'Water industry'}];
        var regions = [{name:'United Kingdom'}, {name:'Germany'}, {name:'Italy'}, {name:'France'}, {name:'...'}];
        var timeframes = [{name:'Unlimited'}, {name:'Until Date'}];
        var purposes = [{name:'All purposes'}, {name:'Academic'}, {name:'Commercial'}];
        var transferabilities = [{name:'Sublicensing right'}, {name:'Sublicensing right with restrictions'},
                                 {name:'No sublicensing right'}];
        var standards = [{name:'Public Domain Dedication and License (PDDL)', summary: 'https://opendatacommons.org/licenses/pddl/summary/', legalText: 'https://opendatacommons.org/licenses/pddl/1.0/'},
                         {name:'Attribution License (ODC-BY)', summary: 'https://opendatacommons.org/licenses/by/summary/', legalText: 'https://opendatacommons.org/licenses/by/1.0/'},
                         {name:'Open Database License (ODC-ODbl)', summary: 'https://opendatacommons.org/licenses/odbl/summary/', legalText: 'https://opendatacommons.org/licenses/odbl/1.0/'},
                         {name:'Attribution 4.0 International (CC BY 4.0)', summary: 'https://creativecommons.org/licenses/by/4.0/', legalText: 'https://creativecommons.org/licenses/by/4.0/legalcode'},
                         {name:'Attribution-NoDerivatives International 4.0 (CC BY-ND 4.0)', summary: 'https://creativecommons.org/licenses/by-nd/4.0/', legalText: 'https://creativecommons.org/licenses/by-nd/4.0/legalcode'},
                         {name:'Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)', summary: 'https://creativecommons.org/licenses/by-sa/4.0/', legalText: 'https://creativecommons.org/licenses/by-sa/4.0/legalcode'},
                         {name: 'Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)', summary: 'https://creativecommons.org/licenses/by-nc/4.0/', legalText: 'https://creativecommons.org/licenses/by-nc/4.0/legalcode'},
                         {name: 'Attribution-NonCommercial-NoDerivatives 4.0 International (CC BY-NC-ND 4.0)', summary: 'https://creativecommons.org/licenses/by-nc-nd/4.0/', legalText: 'https://creativecommons.org/licenses/by-nc-nd/4.0/legalcode'},
                         {name: 'Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)', summary: 'https://creativecommons.org/licenses/by-nc-sa/4.0/', legalText: 'https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode'}];


        var TEMPLATES = {
            PRICE: {
                currencyCode: 'EUR',
                dutyFreeAmount: 0,
                percentage: 0,
                taxIncludedAmount: 0,
                taxRate: 20
            },
            PRICEPLAN: {
                description: '',
                name: '',
                price: {},
                priceType: TYPES.PRICE.ONE_TIME,
                recurringChargePeriod: '',
                unitOfMeasure: ''
            },
            RESOURCE: {
                bundledProductOffering: [],
                category: [],
                description: '',
                isBundle: false,
                lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
                name: '',
                place: [],
                productOfferingPrice: [],
                validFor: {},
                version: '0.1'
            }
        };

        var Price = function Price(data) {
            angular.extend(this, TEMPLATES.PRICE, data);
            parseNumber(this, ['dutyFreeAmount', 'percentage', 'taxIncludedAmount', 'taxRate']);
        };
        Price.prototype.setCurrencyCode = function setCurrencyCode(codeName) {

            if (codeName in TYPES.CURRENCY_CODE) {
                this.currencyCode = codeName;
            }

            return this;
        };
        Price.prototype.toJSON = function toJSON() {
            return {
                currencyCode: this.currencyCode,
                dutyFreeAmount: this.taxIncludedAmount / ((100 + this.taxRate) / 100),
                percentage: this.percentage,
                taxIncludedAmount: this.taxIncludedAmount,
                taxRate: this.taxRate
            };
        };
        Price.prototype.toString = function toString() {
            return this.taxIncludedAmount + ' ' + angular.uppercase(this.currencyCode);
        };

        var PricePlan = function PricePlan(data) {
            angular.extend(this, TEMPLATES.PRICEPLAN, data);
            this.price = new Price(this.price);
        };
        PricePlan.prototype.setType = function setType(typeName) {

            if (typeName in TYPES.PRICE && !angular.equals(this.priceType, typeName)) {
                this.priceType = TYPES.PRICE[typeName];
                this.unitOfMeasure = '';
                this.recurringChargePeriod = '';

                switch (angular.lowercase(this.priceType)) {
                case TYPES.PRICE.RECURRING:
                    this.recurringChargePeriod = TYPES.CHARGE_PERIOD.WEEKLY;
                    break;
                }
            }

            return this;
        };
        PricePlan.prototype.toString = function toString() {
            var result = '' + this.price.toString();

            switch (angular.lowercase(this.priceType)) {
            case TYPES.PRICE.ONE_TIME:
                break;
            case TYPES.PRICE.RECURRING:
                result += ' / ' + angular.uppercase(this.recurringChargePeriod);
                break;
            case TYPES.PRICE.USAGE:
                result += ' / ' + angular.uppercase(this.unitOfMeasure);
                break;
            }

            return result;
        };

        return {
            EVENTS: EVENTS,
            TEMPLATES: TEMPLATES,
            TYPES: TYPES,
            PATCHABLE_ATTRS: PATCHABLE_ATTRS,
            PricePlan: PricePlan,
            search: search,
            count: count,
            exists: exists,
            create: create,
            detail: detail,
            update: update,
            exclusivities: exclusivities,
            sectors: sectors,
            regions: regions,
            timeframes: timeframes,
            purposes: purposes,
            transferabilities: transferabilities,
            standards: standards
        };

        function query(deferred, filters, method, callback) {
            var params = {};

            if (!angular.isObject(filters)) {
                filters = {};
            }

            if (filters.catalogueId) {
                params.catalogue = 'catalog';
                params.catalogueId = filters.catalogueId;
            }

            if (filters.id) {
                params['id'] = filters.id;
            }

            if (filters.status) {
                params['lifecycleStatus'] = filters.status;
            }

            if (filters.type  !== undefined) {
                params['isBundle'] = filters.type == 'Bundle';
            }

            if (filters.categoryId) {
                params['category.id'] = filters.categoryId;
            }

            if (filters.action) {
                params['action'] = filters.action;
            }

            if (filters.owner) {
                params['relatedParty'] = User.loggedUser.currentUser.id;
            } else {
                params['lifecycleStatus'] = LIFECYCLE_STATUS.LAUNCHED;
            }

            if (filters.sort) {
                params['sort'] = filters.sort;
            }

            if (filters.offset !== undefined) {
                params['offset'] = filters.offset;
                params['size'] = filters.size;
            }

            if (filters.body !== undefined) {
                params['body'] = filters.body.replace(/\s/g, ',');
            }

            if (filters.productSpecId !== undefined) {
                params['productSpecification.id'] = filters.productSpecId;
            }

            method(params, function (offeringList) {
                callback(offeringList);
            }, function (response) {
                deferred.reject(response);
            });

            return deferred.promise;
        }

        function search(filters) {
            var deferred = $q.defer();

            function searchOfferingProducts(productFilters, offeringList) {
                ProductSpec.search(productFilters).then(function (productList) {
                    offeringList.forEach(function(offering) {
                        productList.some(function(product) {
                            if (offering.productSpecification && offering.productSpecification.id == product.id) {
                                offering.productSpecification = product;
                                return true;
                            }
                        });
                    });
                    deferred.resolve(offeringList);
                });
            }

            return query(deferred, filters, resource.query, function(offeringList) {
                if (offeringList.length) {
                    var bundleOfferings = [];
                    var productFilters = {
                        id: offeringList.map(function (offering) {
                            var offId = '';
                            extendPricePlans(offering);

                            if (!offering.isBundle) {
                                offId = offering.productSpecification.id;
                            } else {
                                bundleOfferings.push(offering);
                            }
                            return offId;
                        }).join()
                    };

                    if (!bundleOfferings.length) {
                        searchOfferingProducts(productFilters, offeringList);
                    } else {
                        var processed = 0;
                        bundleOfferings.forEach(function(offering) {
                            attachOfferingBundleProducts(offering, function(res) {
                                processed += 1;

                                if (res) {
                                    deferred.reject(res);
                                } else if (processed == bundleOfferings.length) {
                                    searchOfferingProducts(productFilters, offeringList);
                                }
                            });
                        });
                    }

                } else {
                    deferred.resolve(offeringList);
                }
            });
        }

        function count(filters) {
            var deferred = $q.defer();
            filters.action = 'count';

            return query(deferred, filters, resource.get, function (countRes) {
                deferred.resolve(countRes);
            });
        }

        function exists(params) {
            var deferred = $q.defer();

            resource.query(params, function (offeringList) {
                deferred.resolve(!!offeringList.length);
            });

            return deferred.promise;
        }

//{
//    "bundledProductOffering": [],
//    "category": [],
//    "description": "Description",
//    "isBundle": false,
//    "lifecycleStatus": "Active",
//    "name": "Name",
//    "place": [{
//        "name": "Place"
//    }],
//    "productOfferingPrice": [],
//    "validFor": {
//        "startDateTime": "2018-03-09T15:23:21+00:00"
//    },
//    "version": "0.1",
//    "serviceCandidate": {
//        "id": "defaultRevenue",
//        "name": "Revenue Sharing Service"
//    },
//    "productOfferingTerm": [{
//        "name": "My custom license",
//        "description": "description",
//        "type": "Custom",
//        "isFullCustom": false,
//        "exclusivity": "Exclusive",
//        "sector": "All sectors",
//        "region": "All regions",
//        "purpose": "All purposes",
//        "duration": "12",
//        "transferability": "Sublicensing right",
//        "validFor": {
//                "startDateTime": "2018-04-19T16:42:23-04:00",
//                "endDateTime": "2019-04-18T16:42:23-04:00"
//        }
//    }],
//    "productSpecification": {
//        "id": "1",
//        "href": "http://127.0.0.1:8000/DSProductCatalog/api/catalogManagement/v2/productSpecification/4:(0.1)"
//    }
//}
        function create(data, product, catalogue, terms) {
            var deferred = $q.defer();
            var params = {
                catalogue: 'catalog',
                catalogueId: catalogue.id
            };
            var bundledProductOffering = data.bundledProductOffering;

            angular.extend(data, {
                category: data.category.map(function (category) {
                    return category.serialize();
                }),
                bundledProductOffering: data.bundledProductOffering.map(function (offering) {
                    return offering.serialize();
                })
            });

            if(!data.isBundle) {
                angular.extend(data, {
                    productSpecification: product.serialize()
                });
            }

            angular.extend(data, {
                productOfferingTerm: terms
            });


            data.validFor = {
                startDateTime: moment().format()
            };

            resource.save(params, data, function (offeringCreated) {
                offeringCreated.productSpecification = product;
                offeringCreated.bundledProductOffering = bundledProductOffering;
                deferred.resolve(offeringCreated);
            }, function (response) {
                deferred.reject(response);
            });

            return deferred.promise;
        }

        function parseNumber(context, names) {
            names.forEach(function (name) {
                if (angular.isString(context[name])) {
                    context[name] = Number(context[name]);
                }
            });
        }

        function attachOfferingBundleProducts(offering, callback) {
            if (!angular.isArray(offering.bundledProductOffering)) {
                offering.bundledProductOffering = [];
            }

            var params = {
                id: offering.bundledProductOffering.map(function (data) {
                    return data.id;
                }).join()
            };

            resource.query(params, function (offeringList) {
                offering.bundledProductOffering = offeringList;
                var bundleIndexes = {};
                var productParams = {
                    id: offeringList.map(function (data, index) {
                        extendPricePlans(data);
                        bundleIndexes[data.productSpecification.id] = index;
                        return data.productSpecification.id
                    }).join()
                };

                ProductSpec.search(productParams).then(function (productList) {
                    // Include product spec info in bundled offering
                    productList.forEach(function (product) {
                        offering.bundledProductOffering[bundleIndexes[product.id]].productSpecification = product;
                    });
                    callback();
                }, function (response) {
                    callback(response);
                });
            }, function (response) {
                callback(response);
            });
        }

        function detail(id) {
            var deferred = $q.defer();
            var params = {
                id: id
            };

            resource.query(params, function (collection) {

                if (collection.length) {
                    var productOffering = collection[0];

                    extendPricePlans(productOffering);
                    if (productOffering.productSpecification) {
                        ProductSpec.detail(productOffering.productSpecification.id).then(function (productRetrieved) {
                            productOffering.productSpecification = productRetrieved;
                            detailRelationship(productOffering);
                        });
                    } else {
                        extendBundledProductOffering(productOffering);
                    }
                } else {
                    deferred.reject(404);
                }
            }, function (response) {
                deferred.reject(response);
            });

            return deferred.promise;

            function detailRelationship(productOffering) {
                if (productOffering.productSpecification.productSpecificationRelationship.length) {
                    var params = {
                        'productSpecification.id': productOffering.productSpecification.productSpecificationRelationship.map(function (relationship) {
                            relationship.productOffering = [];
                            return relationship.productSpec.id;
                        }).join()
                    };

                    resource.query(params, function (collection) {
                        if (collection.length) {
                            collection.forEach(function (productOfferingRelated) {
                                extendPricePlans(productOfferingRelated);
                                productOffering.productSpecification.productSpecificationRelationship.forEach(function (relationship) {
                                    if (productOfferingRelated.productSpecification.id === relationship.productSpec.id) {
                                        productOfferingRelated.productSpecification = relationship.productSpec;
                                        relationship.productOffering.push(productOfferingRelated);
                                    }
                                });
                            });
                        }
                        extendCategory(productOffering);
                    }, function (response) {
                        deferred.reject(response);
                    });
                } else {
                    extendCategory(productOffering);
                }
            }

            function extendBundledProductOffering(offering) {

                if (offering.isBundle) {
                    attachOfferingBundleProducts(offering, function(res) {
                        if (res) {
                            deferred.reject(res);
                        } else {
                            extendCategory(offering);
                        }
                    });
                } else {
                    extendCategory(offering);
                }
            }

            function extendCategory(offering) {
                var categories = 0;

                if (!angular.isArray(offering.category)) {
                    offering.category = [];
                }

                if (offering.category.length) {
                    offering.category.forEach(function (data, index) {
                        Category.detail(data.id, false).then(function (categoryRetrieved) {
                            offering.category[index] = categoryRetrieved;
                            categories++;

                            if (categories === offering.category.length) {
                                deferred.resolve(offering);
                            }
                        });
                    });
                } else {
                    deferred.resolve(offering);
                }
            }
        }

        function extendPricePlans(productOffering) {
            if (!angular.isArray(productOffering.productOfferingPrice)) {
                productOffering.productOfferingPrice = [];
            } else {
                productOffering.productOfferingPrice = productOffering.productOfferingPrice.map(function (pricePlan) {
                    return new PricePlan(pricePlan);
                });
            }
        }

        function update(offering, data) {
            var deferred = $q.defer();
            var params = {
                catalogue: 'catalog',
                catalogueId: getCatalogueId(offering),
                offeringId: offering.id
            };

            resource.update(params, data, function (offeringUpdated) {
                deferred.resolve(offeringUpdated);
            }, function (response) {
                deferred.reject(response);
            });

            return deferred.promise;
        }

        function getCatalogueId(offering) {
            var keys = offering.href.split('/');
            return keys[keys.indexOf('catalog') + 1];
        }

        function serialize() {
            /* jshint validthis: true */
            return {
                id: this.id,
                href: this.href
            };
        }

        function getCategories() {
            /* jshint validthis: true */
            var ids = this.category.filter(hasParentId).map(getParentId);

            return this.category.filter(function (category) {
                return ids.indexOf(category.id) === -1;
            });

            function hasParentId(category) {
                return !category.isRoot;
            }

            function getParentId(category) {
                return category.parentId;
            }
        }

        function getPicture() {
            /* jshint validthis: true */
            var picture = null;
            if (this.productSpecification) {
                picture = this.productSpecification.getPicture();
            } else {
                // The offering is a bundle, get a random image from its bundled offerings
                var imageIndex = Math.floor(Math.random() * (this.bundledProductOffering.length));
                picture = this.bundledProductOffering[imageIndex].productSpecification.getPicture();
            }
            return picture;
        }

        function formatCheapestPricePlan() {
            /* jshint validthis: true */
            var result = "", pricePlan = null, pricePlans = [];

            if (this.productOfferingPrice.length) {
                pricePlans = this.productOfferingPrice.filter(function (pricePlan) {
                    return angular.lowercase(pricePlan.priceType) === TYPES.PRICE.ONE_TIME;
                });

                if (pricePlans.length) {
                    for (var i = 0; i < pricePlans.length; i++) {
                        if (pricePlan == null || Number(pricePlan.price.taxIncludedAmount) > Number(pricePlans[i].price.taxIncludedAmount)) {
                            pricePlan = this.productOfferingPrice[i];
                        }
                    }
                    result = 'From ' + pricePlan.toString();
                } else {
                    pricePlans = this.productOfferingPrice.filter(function (pricePlan) {
                        return [TYPES.PRICE.RECURRING, TYPES.PRICE.USAGE].indexOf(angular.lowercase(pricePlan.priceType)) !== -1;
                    });
                    result = 'From ' + pricePlans[0].toString();
                }
            } else {
                result = 'Free';
            }

            return result;
        }

        function appendPricePlan(pricePlan) {
            /* jshint validthis: true */
            var deferred = $q.defer();
            var dataUpdated = {
                productOfferingPrice: this.productOfferingPrice.concat(pricePlan)
            };

            update(this, dataUpdated).then(function () {
                this.productOfferingPrice.push(pricePlan);
                deferred.resolve(this);
            }.bind(this), function (response) {
                deferred.reject(response);
            });

            return deferred.promise;
        }

        function updatePricePlan(index, pricePlan) {
            /* jshint validthis: true */
            var deferred = $q.defer();
            var dataUpdated = {
                productOfferingPrice: this.productOfferingPrice.slice(0)
            };

            dataUpdated.productOfferingPrice[index] = pricePlan;

            update(this, dataUpdated).then(function () {
                angular.merge(this.productOfferingPrice[index], pricePlan);
                deferred.resolve(this);
            }.bind(this), function (response) {
                deferred.reject(response);
            });

            return deferred.promise;
        }

        function removePricePlan(index) {
            /* jshint validthis: true */
            var deferred = $q.defer();
            var dataUpdated = {
                productOfferingPrice: this.productOfferingPrice.slice(0)
            };

            dataUpdated.productOfferingPrice.splice(index, 1);

            update(this, dataUpdated).then(function () {
                this.productOfferingPrice.splice(index, 1);
                deferred.resolve(this);
            }.bind(this), function (response) {
                deferred.reject(response);
            });

            return deferred.promise;
        }

        function relationshipOf(productOffering) {
            /* jshint validthis: true */
            var i, relationship;

            for (var i = 0; i < this.productSpecification.productSpecificationRelationship.length; i++) {
                relationship = this.productSpecification.productSpecificationRelationship[i];
                if (relationship.productOffering.indexOf(productOffering) !== -1) {
                    return relationship;
                }
            }

            return null;
        }

        function relationships() {
            /* jshint validthis: true */
            var results = [];

            this.productSpecification.productSpecificationRelationship.forEach(function (relationship) {
                results = results.concat(relationship.productOffering);
            });

            return results;
        }
    }

})();
