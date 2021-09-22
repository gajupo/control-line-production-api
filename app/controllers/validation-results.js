'use strict';

const { utcToZonedTime,format,zonedTimeToUtc } = require('date-fns-tz');
const { isValid, parseISO, parse, getMinutes  } = require('date-fns');
const differenceInMinutes = require('date-fns/differenceInMinutes');
const { Sequelize, Op } = require('sequelize');
const { logError } = require('../helpers/logger');
const { internalServerError }= require("./core");
const services = require('../services');
const { getDatePartConversion } = require('../helpers/sequelize');
const { ValidationResult, Order, Shift, Material } = require('../models');
const lib = require('../helpers/lib');

async function getValidationResultsPerHour(req, res) {
    try {
        const params = req.body;
        const productionPerHour = await services.ValidationResults.getValidationResultsPerHourImpl(params);
        const joined = joinValidationsAndProductionRate(productionPerHour,{},params.shiftStart, params.shiftEnd);
        res.json(joined);
    }
    catch(error) {
        logError("Error in getValidationResultsPerHour", error);
        return internalServerError(`Internal server error`, res);
    }

}

async function getValidationResultsPerHourImpl(params) {
    const today = utcToZonedTime(params.date, "America/Mexico_City");
    
    const validations = await ValidationResult.findAll({
        attributes:[
            [Sequelize.fn('DATEPART', Sequelize.literal('HOUR'), Sequelize.col('ValidationResult.ScanDate')), 'hour'],
            [Sequelize.fn('COUNT', Sequelize.col('ValidationResult.Id')), 'validationResultsCount']],
        include: [{
            model: Order,
            required: true,
            attributes: [],
            include: [{
                model: Shift,
                required: true,
                attributes: [],
                where: {
                    id: params.shiftId,
                    active: true
                }
            }],
            where: {
                [Op.and]: [
                    Sequelize.where(Sequelize.col('Order.ProductionLineId'), '=', params.productionLineId),
                    Sequelize.where(getDatePartConversion('Order.CreatedAt'), '=', today)        
                ]
            }
        }],
        where: {
            [Op.and]: [
                Sequelize.where(Sequelize.col('ValidationResult.CustomerId'), '=', params.customerId),
                Sequelize.where(getDatePartConversion('ValidationResult.ScanDate'), '=', today)
            ]
        },
        group: [Sequelize.fn('DATEPART', Sequelize.literal('HOUR'), Sequelize.col('ValidationResult.ScanDate'))],
        raw: true
    });
    return validations;
}

async function getProductionRatePerHourImpl(params) {
    const today = utcToZonedTime(params.date, "America/Mexico_City");
    const productionRates = await Order.findAll({
        attributes: [
            [Sequelize.fn('DATEPART', Sequelize.literal('HOUR'), Sequelize.col('Order.CreatedAt')), 'hour'],
            [Sequelize.fn('SUM', Sequelize.col('Material.ProductionRate')), 'productionRatesSum']
        ],
        include: [{
            model: Material,
            required: true,
            attributes: []
        }],
        where: {
            [Op.and]: [
                Sequelize.where(Sequelize.col('Order.ShiftId'), '=', params.shiftId),
                Sequelize.where(Sequelize.col('Order.ProductionLineId'), '=', params.productionLineId),
                Sequelize.where(getDatePartConversion('Order.CreatedAt'), '=', today)        
            ]
        },
        group: [
            Sequelize.fn('DATEPART', Sequelize.literal('HOUR'), Sequelize.col('Order.CreatedAt')),
            'Material.ID',
            'Material.ProductionRate'
        ],
        raw: true
    });
    return productionRates;
}

function joinValidationsAndProductionRate(validationResults, productionRates, shiftStartStr, shiftEndStr) {   
    const adjustedShiftStart = lib.getShiftHour(shiftStartStr);
    const adjustedShiftEnd = lib.getShiftHour(shiftEndStr);
    let hours = [];
    let results = [];
    let rates = [];
    // we need the first order to get the production rate in case some hours does not have production, but however we need to put some production rate
    const firstOrder = validationResults.find(result => result.validationResults > 0);
    // loop from the first hour of the shift to last one
    for (let i = adjustedShiftStart; i <= adjustedShiftEnd; i++) {
        hours.push(i);
        const countByHour = validationResults.filter(result => result.hour == i).length;
        // get all materials processed by the current hour
        const validations = validationResults.filter(result => result.hour == i);

        if(countByHour == 0){
            // in this hour there is no material validations
            results.push(0);
            rates.push(firstOrder.ProductionRate || 0);
        }
        if (countByHour === 1) {
            //get worked minutes
            let maxUtcDateScanedMinutes  = 0;
            // get the max date of the last barcode scaned, this means it is the last time the order was used
            const maxUtcDateScaned = zonedTimeToUtc(validations[0].maxDate, "America/Mexico_City")
            if (isValid(maxUtcDateScaned)) {
                maxUtcDateScanedMinutes = getMinutes(maxUtcDateScaned);
            }

            let rate = Math.ceil( (parseInt(validations[0].ProductionRate) * maxUtcDateScanedMinutes)/60 );
            console.log(maxUtcDateScanedMinutes);
            rates.push((maxUtcDateScanedMinutes * rate) / 60);
            results.push(validations[0].validationResults);
        } else if(countByHour === 2) {
            // when we have just two different material in the same hour
            //get worked minutes
            let minUtcDateScanedMinutes,maxUtcDateScanedMinutes  = 0;
            
            // get the min date of the first barcode scaned, this means it is the first time the order was used
            const maxUtcDateScaned = zonedTimeToUtc(validations[0].maxDate, "America/Mexico_City")
            const minUtcDateScaned = zonedTimeToUtc(validations[1].minDate, "America/Mexico_City")
            if (isValid(minUtcDateScaned) && isValid(maxUtcDateScaned)) {
                minUtcDateScanedMinutes = getMinutes(minUtcDateScaned);
                maxUtcDateScanedMinutes = getMinutes(maxUtcDateScaned);
            }
            // rate for the first material
            let firstRate = Math.ceil( (parseInt(validations[0].ProductionRate) * maxUtcDateScanedMinutes) / 60 );
            // rate for the last material, because the such hour just two orders were processed
            let lastRate = Math.ceil( ( ( 60 - minUtcDateScanedMinutes ) * parseInt(validations[1].ProductionRate) ) / 60 );
            // calculate the total of validation resualts
            let totalOfValidations = validations[0].validationResults + validations[1].validationResults;
            results.push(totalOfValidations);
            rates.push(firstRate + lastRate);
        }
        else{
            // when we have more that two different materials processed in the same hour
            //get worked minutes
            let minUtcDateScanedMinutes,maxUtcDateScanedMinutes, sumMiddleMaterialRates, globalRate, globalValidationResults, sumMiddleValidationResults  = 0;
            
            // get the min date of the first barcode scaned, this means it is the first time the order was used
            const maxUtcDateScaned = zonedTimeToUtc(validations[0].maxDate, "America/Mexico_City")
            const minUtcDateScaned = zonedTimeToUtc(validations[validations.length - 1].minDate, "America/Mexico_City")
            if (isValid(minUtcDateScaned) && isValid(maxUtcDateScaned)) {
                minUtcDateScanedMinutes = getMinutes(minUtcDateScaned);
                maxUtcDateScanedMinutes = getMinutes(maxUtcDateScaned);
            }
             // rate for the first material
             let firstRate = Math.ceil( (parseInt(validations[0].ProductionRate) * maxUtcDateScanedMinutes) / 60 );
             // rate for the last material, because the such hour just two orders were processed
             let lastRate = Math.ceil( ( ( 60 - minUtcDateScanedMinutes ) * parseInt(validations[validations.length - 1].ProductionRate) ) / 60 );

             for (let index = 1; index < validations.length - 1; index++) {
                let maxUtcDateScaned = zonedTimeToUtc(validations[index].maxDate, "America/Mexico_City")
                let minUtcDateScaned = zonedTimeToUtc(validations[index].minDate, "America/Mexico_City")
                let difference = differenceInMinutes(maxUtcDateScaned,minUtcDateScaned,'ceil');
                console.log(difference);
                sumMiddleMaterialRates += (difference * validations[index].maxDate) / 60;
                sumMiddleValidationResults += validations[index].validationResults;
             }

             globalRate = firstRate + sumMiddleMaterialRates + lastRate;
             globalValidationResults = validations[0].validationResults + sumMiddleValidationResults + validations[validations.length - 1].validationResults;
             results.push(globalValidationResults);
             rates.push(globalRate);
        }
    }
    const joined = {
        hours: hours,
        validationResults: results,
        productionRates: rates
    };
    return joined;
}

module.exports.getValidationResultsPerHour = getValidationResultsPerHour;
