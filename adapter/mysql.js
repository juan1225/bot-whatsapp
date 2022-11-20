const {connection} = require('../config/mysql')
const stepsReponse = require('../flow/buttons.json')
const DATABASE_NAME = process.env.SQL_DATABASE || 'db_test'

getData = (message = '', callback) => connection.query(
    `SELECT * FROM ${DATABASE_NAME}.initial WHERE keywords LIKE '%${message}%'  LIMIT 1`,
    (error, results
        ) => {
    const [response] = results   
    const key = response?.option_key || null
    callback(key)
});

getValmsn = (message = '', callback) => connection.query(
    `SELECT count(*)conteo FROM ${DATABASE_NAME}.messages where number = '${message}' and date BETWEEN DATE_SUB(NOW(), INTERVAL 2 HOUR) AND NOW()`,
    (error, results
        ) => {
    const [response] = results
    const key = response?.conteo || null
    callback(key)
});


getReply = (option_key = '', callback) => connection.query(
    `SELECT * FROM ${DATABASE_NAME}.response WHERE option_key = '${option_key}'  LIMIT 1`,
    (error, results
        ) => {
    const [response] = results;
    var value = '';
    var actions = '';

    if(response?.actions != ''){
        actions = JSON.parse(response?.actions)
        actions.buttons = stepsReponse[option_key].buttons
        value = {
            replyMessage:response?.replyMessage || '',
            trigger:response?.trigger || '',
            media:response?.media || '',
            actions:actions || ''     
        }
    }else{
        value = {
            replyMessage:response?.replyMessage || '',
            trigger:response?.trigger || '',
            media:response?.media || ''  
        }
    }
    callback(value)
});

getMessages = ( number ) => new Promise((resolve,reejct) => {
    try {
        connection.query(
        `SELECT * FROM ${DATABASE_NAME}.response WHERE number = '${number}'`, (error, results) => {
            if(error) {
                console.log(error)
            }
            const [response] = results;
            console.log(response)
            const value = {
                replyMessage:response?.replyMessage || '',
                trigger:response?.trigger || '',
                media:response?.media || ''
            }
            resolve(value)
        })
    } catch (error) {
        
    }
})

saveMessageMysql = ( message, trigger, number ) => new Promise((resolve,reejct) => {
    try {
        connection.query(
        `INSERT INTO ${DATABASE_NAME}.messages  `+"( `message`, `date`, `trigger`, `number`)"+` VALUES ('${message}',now(),'${trigger}', '${number}')` , (error, results) => {
            if(error) {
                //TODO esta parte es mejor incluirla directamente en el archivo .sql template
                console.log('DEBES DE CREAR LA TABLA DE MESSAGE')
                // if( error.code === 'ER_NO_SUCH_TABLE' ){
                //     connection.query( `CREATE TABLE ${DATABASE_NAME}.messages `+"( `date` DATE NOT NULL , `message` VARCHAR(450) NOT NULL , `trigger` VARCHAR(450) NOT NULL , `number` VARCHAR(50) NOT NULL ) ENGINE = InnoDB", async (error, results) => {
                //         setTimeout( async () => {
                //             return resolve( await this.saveMessageMysql( message, date, trigger, number ) )
                //         }, 150)
                //     })
                // }
            }
            resolve(results)
        })
    } catch (error) {
        
    }
})

module.exports = {getData,getValmsn, getReply, saveMessageMysql}