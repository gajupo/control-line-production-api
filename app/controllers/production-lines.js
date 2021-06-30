'use strict';

const { logError } = require('../helpers/logger');
const { internalServerError } = require("./core");
const { Sequelize } = require('sequelize');
const { sequelize } = require("../helpers/sequelize");
const { ProductionLine, OperatingStation, validateModelId, Customer,
    ValidationResult, Order, Material, Shift } = require('../models');

async function getProductionLines(res) {
    try {
        const productionlines = await ProductionLine.findAll({
            include: [{
                model: OperatingStation,
                attributes: ['id', 'stationIdentifier']
            }],
            attributes: ['id', 'lineName']
        });
        res.json(productionlines);
    }
    catch (error) {
        logError("Error in getProductionLines", error);
        return internalServerError(`Internal server error`, res);
    }
}

async function getProductionLine(lineId) {
    
    var productionLine = await ProductionLine.findOne({
        where: { id: lineId },
        include: [{
            model: OperatingStation,
            attributes: ['id', 'stationIdentifier']
        }],
        attributes: ['id']
    });
    return productionLine;
}

async function getProductionLinesPerCustomer(req, res) {
    try {
        const customer = validateModelId(req.params.customerId);
        if (!customer.isValid) {
            return badRequestError(`Invalid Customer ID: ${customer.id}`, res, customer.errorList);
        }
        // const validationResults = await ValidationResult.findAll({
        //     attributes: [[Sequelize.fn('count', Sequelize.col('ScanDate')), 'validationResultCount']],
        //     group: ['Customer.Id', 'Customer.customerName',
        //         'OperatingStation.id', 'OperatingStation.stationIdentifier',
        //         'OperatingStation->ProductionLine.id', 'OperatingStation->ProductionLine.lineName',
        //         'Order.id', 'Order.orderIdentifier', 'Order->Shift.id',
        //         'Order->Material.id', 'Order->Material.pasPN', 'Order->Material.productionRate',
        //         'Order->Shift.shiftDescription', 'Order->Shift.shiftStart', 'Order->Shift.shiftEnd'],
        //     include: [{
        //         model: Customer,
        //         required: true,
        //         attributes: ['id', 'customerName'],
        //         where: { id: customer.id }
        //     }, {
        //         model: OperatingStation,
        //         required: true,
        //         attributes: ['id', 'stationIdentifier'],
        //         include: [{
        //             model: ProductionLine,
        //             required: true,
        //             attributes: ['id', 'lineName',
        //                 [sequelize.literal(blockedStationsQuery(customer)), 'stationsBlocked'],
        //                 [sequelize.literal(totalStationsQuery(customer)), 'totalStations']]
        //         }]
        //     }, {
        //         model: Order,
        //         required: true,
        //         attributes: ['id', 'orderIdentifier'],
        //         include: [{
        //             model: Shift,
        //             required: true,
        //             attributes: ['id', 'shiftDescription', 'shiftStart', 'shiftEnd'],
        //         }, {
        //             model: Material,
        //             required: true,
        //             attributes: ['id', 'pasPN', 'productionRate'],
        //         }]
        //     }]
        // });
        const validationResults = await ProductionLine.findAll({
            attributes: ['id', 'lineName'],
            include: [{
                model: Customer,
                required: true,
                attributes: ['id', 'customerName'],
                where: { id: customer.id }
            }, {
                model: OperatingStation,
                attributes: [
                    'id',
                    'stationIdentifier',
                    [Sequelize.fn('count', Sequelize.col('Orders.ValidationResults.Id')), 'validationResultCount']],
            }, {
                model: Order,
                attributes: ['id'],
                required: false,
                include: [{
                    model: Material,
                    attributes: ['id', 'productionRate'],
                    required: false
                }, {
                    model: Shift,
                    attributes: ['id', 'shiftStart', 'shiftEnd'],
                }, {
                    model: ValidationResult,
                    attributes: [],
                    required: false
                }]
            }],
            group: ['ProductionLine.id', 'ProductionLine.lineName', 'OperatingStations.id',
                'OperatingStations.stationIdentifier', 'Orders.Material.id', 'Orders.Material.productionRate',
                'Orders.Shift.id', 'Orders.Shift.shiftStart', 'Orders.Shift.shiftEnd', 'Orders.id',
                'Customer.id', 'Customer.customerName'],
        });
        const result = transformValidationResult(validationResults);
        // res.json(validationResults);
        res.json(result);
    }
    catch (error) {
        logError("Error in getProductionLinesPerCustomer", error);
        return internalServerError(`Internal server error`, res);
    }
}

function transformValidationResult(validationResults) {
    var productionLines = [];

    validationResults.forEach((validation) => {
        consolidateValidationResult(productionLines, validation.dataValues);
    });

    return productionLines;
}

function consolidateValidationResult(productionLines, validationResult) {
    const line = validationResult;
    if (line.hasOwnProperty('OperatingStations')) {
        const customer = line.Customer;
        const stations = line.OperatingStations;
        let active = false;
        let productionRate = 0;
        let validationResultCount = 0;

        stations.forEach(station => {
            validationResultCount += station.dataValues.validationResultCount;
        });
        if (line.hasOwnProperty('Orders')) {
            const orders = line.Orders;
            orders.forEach(order => {
                const material = order.Material;
                const shiftHours = getHoursPerShift(order.Shift);
                const rate = shiftHours * material.productionRate;

                productionRate += rate;
            });
            active = orders.length > 0;
        }
        productionLines.push( {
            id: line.id,
            lineName: line.lineName,
            active: active,
            customerId: customer.id,
            customerName: customer.customerName,
            validationResultCount: validationResultCount,
            productionRate: productionRate,
            stationCount: stations.length,
            stoppedStations: 0,
            rate: getProductionRate(validationResultCount, productionRate)
        });
    }
    // if (validationResult.hasOwnProperty('OperatingStation')) {
    //     const station = validationResult.OperatingStation;
    //     if (station.hasOwnProperty('ProductionLine')) {
    //         let line = productionLines.find(element => {
    //             return element.id == station.ProductionLine.id;
    //         });
    //         const material = validationResult.Order.Material;
    //         const shift = validationResult.Order.Shift;
    //         const productionRate = material.productionRate * getHoursPerShift(shift);
    //         if (line == null) {
    //             line = station.ProductionLine.dataValues;
    //             productionLines.push( {
    //                 id: line.id,
    //                 lineName: line.lineName,
    //                 validationResultCount: validationResult.validationResultCount,
    //                 goal: productionRate,
    //                 rate: Math.ceil((validationResult.validationResultCount / productionRate) * 100),
    //                 stationsBlocked: line.stationsBlocked,
    //                 totalStations: line.totalStations,
    //                 operatingStations: [{
    //                     id: station.id,
    //                     stationIdentifier: station.stationIdentifier
    //                 }],
    //                 customer: validationResult.Customer
    //             } );
    //         }
    //         else {
    //             line.validationResultCount += validationResult.validationResultCount;
    //             if (line.hasOwnProperty('operatingStations')) {
    //                 if (!line.operatingStations.some((element) => element.id == station.id)) {
    //                     line.operatingStations.push({
    //                         id: station.id,
    //                         stationIdentifier: station.stationIdentifier
    //                     });
    //                 }
    //             }
    //             if (line.hasOwnProperty('goal')) {
    //                 line.goal += productionRate;
    //             }
    //             if (line.hasOwnProperty('rate')) {
    //                 line.rate = Math.ceil((line.validationResultCount / line.goal) * 100);
    //             }
    //         }
    //     }
    // }
}

function getHoursPerShift(shift) {
    if (shift === undefined) {
        return 0;
    }
    return Math.ceil(shift.shiftEnd - shift.shiftStart);
}

function getProductionRate(validationResultCount, productionRate) {
    if (productionRate == 0) {
        return 0;
    }
    return Math.ceil((validationResultCount / productionRate) * 100);
}

function blockedStationsQuery(customer) {
    return `(SELECT COUNT(sc.id) AS stationsBlocked FROM StopCauseLogs sc INNER JOIN OperatingStations op ON
        sc.StationId = op.Id INNER JOIN ProductionLines lp ON lp.Id = sc.StationId INNER JOIN Customers ct ON
        ct.Id = lp.CustomerId WHERE sc.status = 1 AND ct.Id = '${customer.id}')`
}

function totalStationsQuery(customer) {
    return `(SELECT COUNT(op.id) AS totalStations FROM Customers ct INNER JOIN ProductionLines pl
        ON pl.CustomerId = ct.Id INNER JOIN OperatingStations op ON op.LineId = pl.Id
        WHERE ct.Id = '${customer.id}' GROUP BY pl.id, pl.LineName)`;
}

function validationResultsCountQuery(customer) {
    return `(SELECT COUNT([id]) AS validationResultCount FROM [PASSIMPLEDB_DEV.MDF].[dbo].[ValidationResults]
        WHERE [CustomerId] = ${customer.id})`;
}

module.exports.getProductionLines = getProductionLines;
module.exports.getProductionLine = getProductionLine;
module.exports.getProductionLinesPerCustomer = getProductionLinesPerCustomer;
