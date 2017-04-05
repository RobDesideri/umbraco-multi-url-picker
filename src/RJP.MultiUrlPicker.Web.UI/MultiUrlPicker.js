(function (angular, _) {
    'use strict';

    angular.module("umbraco").controller("RJP.MultiUrlPickerController", function ($scope, $q, dialogService, iconHelper, entityResource) {
        var documentIds = [];
        var mediaIds = [];

        $scope.renderModel = [];
        $scope.cfg = { maxNumberOfItems: 0, minNumberOfItems: 0 };
        $scope.sortableOptions = {
            distance: 10,
            tolerance: "pointer",
            scroll: true,
            zIndex: 6000
        };
        $scope.editedMediaId = -1;

        if ($scope.model.value) {
            _.each($scope.model.value, function (item, i) {
                if (item.id) {
                    (item.isMedia ? mediaIds : documentIds).push(item.id);
                }
            });
        }

        var entityLoaded = function (node) {
            var item = _.find($scope.renderModel, function (item) {
                return +item.id === node.id;
            });
            item.icon = iconHelper.convertFromLegacyIcon(node.icon);
            item.published = node.metaData.NodeObjectType !== 'c66ba18e-eaf3-4cff-8a22-41b16d66a972' || node.metaData.IsPublished;
        };

        $q.all([
            entityResource.getByIds(documentIds, 'Document'),
            entityResource.getByIds(mediaIds, 'Media')
        ]).then(function (result) {
            var entities = result[0].concat(result[1]);

            _.each($scope.model.value, function (item) {
                if (item.id) {
                    var entity = _.find(entities, function (e) {
                        return e.id == item.id;
                    });

                    if (entity) {
                        item.icon = iconHelper.convertFromLegacyIcon(entity.icon);
                        $scope.renderModel.push(new Link(item, entity.metaData.NodeObjectType !== 'c66ba18e-eaf3-4cff-8a22-41b16d66a972' || entity.metaData.IsPublished));
                    }
                } else {
                    $scope.renderModel.push(new Link(item, true));
                }
            });

            $scope.$watch(
              function () {
                  return $scope.renderModel.length;
              },
              function (newVal) {
                  if ($scope.renderModel.length) {
                      $scope.model.value = $scope.renderModel;
                  } else {
                      $scope.model.value = null;
                  }

                  if ($scope.cfg.minNumberOfItems && +$scope.cfg.minNumberOfItems > $scope.renderModel.length) {
                      $scope.multiUrlPickerForm.minCount.$setValidity('minCount', false);
                  } else {
                      $scope.multiUrlPickerForm.minCount.$setValidity('minCount', true);
                  }
                  if ($scope.cfg.maxNumberOfItems && +$scope.cfg.maxNumberOfItems < $scope.renderModel.length) {
                      $scope.multiUrlPickerForm.maxCount.$setValidity('maxCount', false);
                  } else {
                      $scope.multiUrlPickerForm.maxCount.$setValidity('maxCount', true);
                  }
              }
            );
        });

        if ($scope.model.config) {
            $scope.cfg = angular.extend($scope.cfg, $scope.model.config);
        }

        if ($scope.cfg.maxNumberOfItems <= 0) {
            delete $scope.cfg.maxNumberOfItems;
        }
        if ($scope.cfg.minNumberOfItems <= 0) {
            $scope.cfg.minNumberOfItems = 0;
        }

        $scope.openLinkPicker = function () {
            dialogService.linkPicker({ callback: $scope.onContentSelected });
        };

        $scope.edit = function (index) {
            var link = $scope.renderModel[index];

            // store the current edited media id
            if (link.isMedia && link.id !== null) {
                $scope.editedMediaId = link.id;
            }

            dialogService.linkPicker({
                currentTarget: {
                    id: link.isMedia ? null : link.id, // the linkPicker breaks if it get an id for media
                    index: index,
                    name: link.name,
                    url: link.url,
                    target: link.target,
                    isMedia: link.isMedia,
                },
                callback: $scope.onContentSelected
            });
        };

        $scope.remove = function (index) {
            $scope.renderModel.splice(index, 1);
            $scope.model.value = $scope.renderModel;
        };

        $scope.$on("formSubmitting", function (ev, args) {
            if ($scope.renderModel.length) {
                $scope.model.value = $scope.renderModel;
            } else {
                $scope.model.value = null;
            }
        });


        $scope.onContentSelected = function (e) {
            var link = new Link(e, true);

            if (e.index !== undefined && e.index !== null) {
                if (link.isMedia && link.id === null) {
                    // we can assume the existing media item is changed and no new file has been selected
                    // so we can restorte the existing id
                    link.id = $scope.editedMediaId;
                }
                $scope.renderModel[e.index] = link;
            } else {
                $scope.renderModel.push(link);
            }

            if (link.id && link.id > 0) {
                entityResource.getById(link.id, link.isMedia ? 'Media' : 'Document').then(entityLoaded);
            }

            $scope.model.value = $scope.renderModel;
            $scope.editedMediaId = -1;
            dialogService.close();
        };

        function Link(link, published) {
            this.id = link.id;
            this.name = link.name || link.url;
            this.url = link.url;
            this.target = link.target;
            this.isMedia = link.isMedia;
            this.icon = link.icon || 'icon-link';
            this.published = published;
        }
    });
})(window.angular, window._);