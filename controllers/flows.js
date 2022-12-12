const {get, reply, valmsn, ngs, ValidaCliente, CreaMapa, ActualizaMapa} = require('../adapter')
const {saveExternalFile, checkIsUrl} = require('./handle')

const getMessages = async (message) => {
    const data = await get(message)
    return data
}

const responseMessages = async (step) => {
    const data = await reply(step)
    if(data && data.media){
        const file = checkIsUrl(data.media) ? await saveExternalFile(data.media) : data.media;
        return {...data,...{media:file}}
    }
    return data
}

const validamns = async (number) => {
    const data = await valmsn(number)
    return data
}

const Negocios = async (id) => {
    const data = await ngs(id)
    return data
}

const ValCli = async (numero) => {   
    const data = await ValidaCliente(numero)
    return data
}

const CreaMap = async (numero) => {
    var sql = `DELETE FROM initial WHERE telefono ='${numero}' `
    await ActualizaMapa(sql)  
    
    var sql = `DELETE FROM tmp_ped_wts WHERE celular ='${numero}' ` 
    await ActualizaMapa(sql) 

    const data = await CreaMapa(numero)    
    return data
}

const ActMapa = async (sql) => {    
    const data = await ActualizaMapa(sql)    
    return data
}

module.exports = { getMessages, responseMessages, validamns, Negocios, ValCli, CreaMap, ActMapa }