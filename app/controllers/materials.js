'use strict';

const { Material } = require("../models");
const { notFoundError } = require("./core");

async function getMaterialList(res) {

    try {
        const materials = await Material.findAll({
            attributes: ['id', 'materialDescription']
        });
        if (materials == null) {
            return notFoundError("There are not active materials");
        }
    }
    catch (error) {
        logError("Error in getMaterialList", error);
        return internalServerError(`Internal server error`, res);
    }
}

module.exports.getMaterialList = getMaterialList;
