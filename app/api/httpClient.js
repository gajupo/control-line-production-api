'use strict';
const config = require('config');
const axios =require('axios');

const httpClient = axios.create({
    baseURL: config.get('idp'),
    headers: {
        'Content-Type': 'application/json',
        
        // anything you want to add to the headers
    },
    //timeout: 15000
});

// interceptor to catch errors
const errorInterceptor = error => {
    console.log('error on interceptor', error);
    // check if it's a server error
    if (!error.response) {
        console.error('Error when requesting the server');
        return Promise.reject(error);
    }

    // all the other error responses
    switch (error.response.status) {
        case 400:
            console.error(error.response.status, error.message);
            //notify.warn('Nothing to display','Data Not Found');
            break;

        case 401: // authentication error, logout the user
            console.log('Please login again');
            //router.push('/auth');
            break;
        case 404:
            console.log("Data not found error 404 ", error.message);
            break;
        default:
        // internal server error = 500

    }
    return Promise.reject(error);
}

// Interceptor for all successfull responses
const responseInterceptor = response => {
    switch (response.status) {
        case 200:
            // yay!
            break;
        // any other cases
        default:
    }
    return response;
}

httpClient.interceptors.response.use(responseInterceptor, errorInterceptor);

module.exports.httpClient = httpClient;