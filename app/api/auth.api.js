const {httpClient} = require('./httpClient');
/* Attention, it can be used in both methods, only canceltoken is deprecated */
//const controller = new AbortController(); //New way cancellable request axios
/*const generateCancellationToken = () => {
    return new AbortController();
}*/

const getVerifyAuth = async (jwt) => {
    try {
        const response = await httpClient.post("/idp/auth/verify",{},{
            headers:{
                'x-auth-token' : jwt
            }
        });
        return response.data;
    } catch (error) {
        
        throw {
            data: error.response ? error.response.data : error.message,
            error: new Error()
        }
    }
}

module.exports.getVerifyAuth = getVerifyAuth;