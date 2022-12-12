const { getData, getReply, getValmsn, saveMessageMysql, getNegocio, getValidaCliente, getCreaMapa } = require('./mysql')
const { saveMessageJson } = require('./jsonDb')
const  stepsInitial = require('../flow/initial.json')
const  stepsReponse = require('../flow/response.json')

const get = (message) => new Promise((resolve, reject) => {
    /**
     * Si usas MYSQL
     */
    if (process.env.DATABASE === 'mysql') {
        getData( message || 'null', (dt) => {
            resolve(dt)
        });
    }

})


const reply = (step) => new Promise((resolve, reject) => {
    /**
     * Si usas MYSQL
     */
    if (process.env.DATABASE === 'mysql') {
        let resData = { replyMessage: '', media: null, trigger: null }
        getReply(step, (dt) => {
            resData = { ...resData, ...dt }
            resolve(resData)
        });
    }
})

/**
 * 
 * @param {*} message 
 * @param {*} date 
 * @param {*} trigger 
 * @param {*} number 
 * @returns 
 */
const saveMessage = ( message, trigger, number  ) => new Promise( async (resolve, reject) => {
     switch ( process.env.DATABASE ) {
         case 'mysql':
             resolve( await saveMessageMysql( message, trigger, number ) )
             break;
         case 'none':
             resolve( await saveMessageJson( message, trigger, number ) )
             break;
         default:
             resolve(true)
             break;
    }
})

const valmsn = (number) => new Promise((resolve, reject) => {
    getValmsn(number, (dt) => {
        resolve(dt)
    });
})

const ngs = (id) => new Promise((resolve, reject) => {
    getNegocio(id,(dt) => {
        resolve(dt)
    });
})

const ValidaCliente = (numero) => new Promise((resolve, reject) => {    
    getValidaCliente(numero,(dt) => {
        resolve(dt)
    });
})

const CreaMapa = (numero) => new Promise((resolve, reject) => {
    const insert = "INSERT INTO initial (telefono,keywords,estado,option_key)	VALUES ('numero','act_nombre','P','STEP_3'),('numero','act_direccion','P','STEP_4'),('numero','pedido','P','STEP_5'),('numero','eliminar','A','STEP_11'),('numero','resumen','P','STEP_6'),('numero','metodo pago','P','STEP_7'),('numero','finalizar','P','STEP_8');"
    const sql = insert.replace(/numero/g, numero)
        getCreaMapa(sql,(dt) => {
        resolve(dt)
    });
})

const ActualizaMapa = (sql) => new Promise((resolve, reject) => {    
    getCreaMapa(sql,(dt) => {
        resolve(dt)
    });
})

module.exports = { get, reply, valmsn, saveMessage, ngs, ValidaCliente, CreaMapa, ActualizaMapa }