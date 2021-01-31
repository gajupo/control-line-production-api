'use strict';

const { Material, PageParameterSchema } = require("../models");
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
        const id = req.params.id;
        if(!isValidCustomerID(id)) {
            return badRequestError(`Invalid customer ID: ${id}`, res);
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

function isValidCustomerID(id) {

    const {error} = PageParameterSchema.validate({ page: id });
    if (error) {
        return false;
    }
    return true;
}

module.exports.getMaterialList = getMaterialList;
module.exports.getMaterialListPerCustomer = getMaterialListPerCustomer;
