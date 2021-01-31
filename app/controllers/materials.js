'use strict';

const { Material, validateModelId } = require("../models");
const { notFoundError, internalServerError, badRequestError } = require("./core");
const { logError } = require('../helpers/logger');

/**
 * Returns the list of all the material stored in the database.
 */
async function getMaterialList(res) {

    try {
        const materials = await Material.findAll({
            attributes: ['id', 'pasPN']
        });
        if (materials == null) {
            return notFoundError("There are not active materials");
        }
        res.json(materials);
    }
    catch (error) {
        logError("Error in getMaterialList", error);
        return internalServerError(`Internal server error`, res);
    }
}

async function getMaterialListPerCustomer(req, res) {

    try {
        const modelId = validateModelId(req.params.id);
        if (!modelId.isValid) {
            return badRequestError(`Invalid customer ID: ${id}`, res, modelId.errorList);
        }
        const materials = await Material.findAll({
            where: { CustomerId: req.params.id },
            attributes: ['id', 'pasPN', 'materialDescription']
        });
        res.json(materials);
    }
    catch (error) {
        logError("Error in getMaterialListPerCustomer", error);
        return internalServerError(`Internal server error`, res);
    }
}

async function getMaterial(materialId) {

    var material = await Material.findOne({
        where: { id: materialId },
        attributes: ['id', 'pasPN']
    });
    return material;
}

module.exports.getMaterialList = getMaterialList;
module.exports.getMaterialListPerCustomer = getMaterialListPerCustomer;
module.exports.getMaterial = getMaterial;
