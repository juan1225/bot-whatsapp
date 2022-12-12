const {connection} = require('../config/mysql')
const stepsReponse = require('../flow/buttons.json')
const DATABASE_NAME = process.env.SQL_DATABASE || 'db_test'

getData = (message = '', callback) => connection.query(
    `SELECT * FROM ${DATABASE_NAME}.initial WHERE keywords LIKE '%${message}%'  LIMIT 1`,
    (error, results
        ) => {
            
    var resp = '';
    if (results === undefined) {
        resp = ''
        }else{
        resp = results
        }
    const [response] = resp
    const key = response?.option_key || null
    callback(key)
});

getValmsn = (message = '', callback) => connection.query(
    `SELECT count(*)conteo FROM ${DATABASE_NAME}.messages where number = '${message}' and date BETWEEN DATE_SUB(NOW(), INTERVAL 1 HOUR) AND NOW()`,
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

getNegocio = (id,callback) => connection.query(
    `SELECT id,outlet_name,address FROM ${DATABASE_NAME}.tbl_outlets where id = '${id}'`,
    (error, results
        ) => {
    const [response] = results
    callback(response)
});

getValidaCliente = (numero = '', callback) => connection.query(
    `SELECT id,name,address FROM tbl_customers WHERE phone ='${numero.replace(/57|@c.us/g, '')}' order by id  desc limit 1`,
    ( error, results ) => {
        
     if(results.length >0){
        console.log("entro")
         connection.query(`UPDATE initial SET estado = 'A' where telefono = '${numero}' and option_key in('STEP_3','STEP_4')` ,
          (error, results) => {})
          callback(results)
     }else{   
     
             callback('STEP_3')
      
     }

});

getCreaMapa = (sql = '', callback) => connection.query(
    sql,(error, results) => {
    callback(results)
});

module.exports = {getData, getValmsn, getReply, saveMessageMysql, getNegocio, getValidaCliente, getCreaMapa}