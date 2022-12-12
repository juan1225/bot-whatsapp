/**
 * ⚡⚡⚡ DECLARAMOS LAS LIBRERIAS y CONSTANTES A USAR! ⚡⚡⚡
 */
 require('dotenv').config()
 const fs = require('fs');
 const express = require('express');
 const cors = require('cors')
 const qrcode = require('qrcode-terminal');
 const { Client,LocalAuth  } = require('whatsapp-web.js');
 const mysqlConnection = require('./config/mysql')
 const { middlewareClient } = require('./middleware/client')
 const { generateImage, cleanNumber, checkEnvFile, createClient, isValidNumber } = require('./controllers/handle')
 const { connectionReady, connectionLost } = require('./controllers/connection')
 const { saveMedia } = require('./controllers/save')
 const { getMessages, responseMessages, validamns, Negocios, ValCli, CreaMap, ActMapa } = require('./controllers/flows')
 const { validarItem, deleteItem, orden, finalizar_orden, crear_cliente, productos, inst_producto,productos_del, LimpiaDatabase } = require('./controllers/pedido')
 const { sendMedia, sendMessage, lastTrigger, sendMessageButton, sendMessageList, readChat } = require('./controllers/send')
 const {saveExternalFile, checkIsUrl} = require('./controllers/handle');
 const { Console } = require('console');
 const app = express();
 app.use(cors())
 app.use(express.json())
 const MULTI_DEVICE = process.env.MULTI_DEVICE || 'true';
 const server = require('http').Server(app)
 
 const port = process.env.PORT || 3000
 const outlet  = process.env.OUTLET || 1
 var client;
 app.use('/', require('./routes/web'))
 
 /**
  * Escuchamos cuando entre un mensaje
  */
 const listenMessage = () => client.on('message', async msg => {
     const { from, body, hasMedia } = msg;
 
     if(!isValidNumber(from)){
         return
     }
 
     // Este bug lo reporto Lucas Aldeco Brescia para evitar que se publiquen estados
     if (from === 'status@broadcast') {
         return
     }
     //llega el mensaje
     message = body.toLowerCase();
     const number = cleanNumber(from)
     //Guarda el historia
     await readChat(number, message)
 
     /**
      * Guardamos el archivo multimedia que envia
      */
     if (process.env.SAVE_MEDIA && hasMedia) {
         const media = await msg.downloadMedia();
         saveMedia(media);
     }
     /**
     * Ver si viene de un paso anterior
     * Aqui podemos ir agregando más pasos
     * a tu gusto!
     */
 
     const lastStep = await lastTrigger(from) || null;
     if (lastStep) {
         const response = await responseMessages(lastStep)
         await sendMessage(client, from, response.replyMessage);
     }
 
     /**
      * Respondemos al primero paso si encuentra palabras clave
      */
      
     //Si quieres tener un mensaje por defecto
     if (process.env.DEFAULT_MESSAGE === 'true' ) {
         const val_mns  = await validamns(number)   
        if(val_mns<=1){   
         await LimpiaDatabase(number)
         const mat_negocios  = await Negocios(outlet)      
         const response = await responseMessages('DEFAULT')
     
         response.actions.title = response.actions.title.replace('[NOMBRE]',mat_negocios.outlet_name)
         response.actions.message = response.actions.message+mat_negocios.address       
             
             await sendMessage(client, from, response.replyMessage, response.trigger);
             if(response.hasOwnProperty('actions')){
                 const { actions } = response;
                 await sendMessageButton(client, from, null, actions);
             }
             return
         }           
     }
 
     const step = await getMessages(message+'*');   
 
     if (step) {
 
         const response = await responseMessages(step);    
   
         if(step=='STEP_1'){
 
             await CreaMap(from)
             const vc = await ValCli(from)     
             
             if(vc=='STEP_3'){
                 const response = await responseMessages('STEP_3');
                 await sendMessage(client, from, response.replyMessage, response.trigger);
             }else{
                 const { actions } = response;
                 actions.message = "*Nombre:* "+vc[0].name.toUpperCase()+"\n*Direccion:* "+vc[0].address
                 await sendMessageButton(client, from, null, actions);
             }         
           
             return
 
         }else if(step=='STEP_2'){
 
             var mat_negocios  = await Negocios(outlet)
             var msn = response.replyMessage.replace('[NOMBRE]',mat_negocios.outlet_name)
             await sendMessage(client, from, msn, response.trigger);
             return 
 
         }else if(step=='STEP_9'){
 
             var sql = "UPDATE initial SET estado = 'A' where telefono = '"+from+"' and option_key in('STEP_3','STEP_4')"
             var prod = await productos()
             await sendMessageList(client, from,prod);
             // await ActMapa(sql);
             // await sendMessage(client, from, response.replyMessage, response.trigger);
             return
             
         }else if(step=='STEP_10'){
 
             var sql = "UPDATE initial SET estado = 'P' where telefono = '"+from+"' and option_key in('STEP_3','STEP_4')"
             const response = await responseMessages('STEP_3');
             await ActMapa(sql);
             await sendMessage(client, from, response.replyMessage, response.trigger);
             return
 
         }else if(step=='STEP_12'){
 
             var sql = "UPDATE initial SET estado = 'P' where telefono = '"+from+"' and option_key = 'STEP_11'"
             await ActMapa(sql);
 
             var sql = "UPDATE initial SET estado = 'A' where telefono = '"+from+"' and option_key = 'STEP_5'"
             await ActMapa(sql);
 
             var prod = await productos_del(from)         
             await sendMessageList(client, from, prod, 'PRODUCTOS ELIMINAR');
             return
 
         }else if(step=='STEP_13'){
 
             const rpt = await orden(from);
             const response = await responseMessages('STEP_13');
             const { actions } = response;
             actions.message = rpt
             await sendMessageButton(client, from, null, actions);
             
             var prod = await productos()              
             await sendMessageList(client, from,prod);
             
         }else if(step=='STEP_7'){
            
             const response = await responseMessages('STEP_7');
             const { actions } = response;
             await sendMessageButton(client, from, null, actions);
             return
 
         }else if(step=='STEP_8'){// 
            const rpt =  await finalizar_orden(from,outlet);
            await sendMessage(client, from, rpt, null);
            return
         }
 
         await sendMessage(client, from, response.replyMessage, response.trigger);
         return 
 
     }else{
 
         var sql = "SELECT option_key  from initial WHERE estado = 'P' limit 1"
         const estado_mapa = await ActMapa(sql);
 
         if(estado_mapa.length>0){      
 
         if(estado_mapa[0].option_key == 'STEP_5'){
 
             var items = message.split('||')
 
            if(items.length == 3){
             
              var rpt = await inst_producto(from,message,'N')
              await sendMessage(client, from, rpt.msn, null);
 
             }else{ 
 
                 var sql = `select * from tmp_ped_wts where cantidad is null and celular = '${from}'`
                 const val_item = await ActMapa(sql);
                 var items = message.split('-')
                 if(items[0]>0){
                     var rpt =  await inst_producto(from,message,'C')
                     const response = await responseMessages(rpt.step);
                     const { actions } = response;
                     actions.message = rpt.msn
                     await sendMessageButton(client, from, null, actions);
      
                     var prod = await productos()
                     await sendMessageList(client, from,prod);
                 }else if(val_item.length>0){
                     var msn = `⚡Ingresa la cantida y preciona enviar\n ⚡ó si tiene una nota como por ejemplo termino 3/4 o jugo sin azucar ingrese de la sigiente manera *separado por un guion* y precione enviar.\n*CANTIDAD-NOTA*\n *➡️ 1-sin azucar*`
                     await sendMessage(client, from, msn, null);
                 }else{
                     var prod = await productos()
                     await sendMessageList(client, from,prod);
                 } 
             }
 
         }else if(estado_mapa[0].option_key == 'STEP_11'){
             var item = message.split('||')
             await deleteItem(from,item[1]);
             const rpt = await orden(from);
 
             await sendMessage(client, from, `Item ${item[1]} eliminado`, null);
             const response = await responseMessages('STEP_13');
             const { actions } = response;
             actions.message = rpt
             await sendMessageButton(client, from, null, actions);
 
             var prod = await productos()
             await sendMessageList(client, from,prod);
 
         }else if(estado_mapa[0].option_key == 'STEP_6'){
 
             const rpt = await orden(from);
             const response = await responseMessages('STEP_13');
             const { actions } = response;
             actions.message = rpt
             await sendMessageButton(client, from, null, actions);
 
         }else if((estado_mapa[0].option_key =='STEP_3' || estado_mapa[0].option_key =='STEP_4')){
             
            var rpt = await crear_cliente(from,message,estado_mapa[0].option_key);
            
            if(rpt == 'STEP_5'){
             var prod = await productos()
             await sendMessageList(client, from, prod);
            }else{
             const response = await responseMessages(rpt);
             await sendMessage(client, from, response.replyMessage, response.trigger);
            }   
         }
     }        
     }    
 });
 
 
 
 client = new Client({
         authStrategy: new LocalAuth(),
         puppeteer: { headless: true }
     });
     
 client.on('qr', qr => generateImage(qr, () => {
         qrcode.generate(qr, { small: true });
         
         console.log(`Ver QR http://localhost:${port}/qr`)
         socketEvents.sendQR(qr)
 }))
 
 client.on('ready', (a) => {
         connectionReady()
         listenMessage()
         // socketEvents.sendStatus(client)
 });
 
 client.on('auth_failure', (e) => {
         // console.log(e)
         // connectionLost()
 });
 
 client.on('authenticated', () => {
         console.log('AUTHENTICATED'); 
 });
 
     client.initialize();
 // api whatsapp
     app.post('/wts', async function (req, res) {  
         const { message, number, media } = req.body
         await sendMessage(client, number, message);
             if(media){
                 const file = checkIsUrl(media) ? await saveExternalFile(media) : '';
                 if(file)
                 sendMedia(client, number, file);
             }
             res.send('Saludos desde express');
     })
 
 /**
  * Verificamos si tienes un gesto de db
  */
 
 if (process.env.DATABASE === 'mysql') {
     mysqlConnection.connect()
 }
 
 server.listen(port, () => {
     console.log(`El server esta listo por el puerto ${port}`);
 })
 checkEnvFile();
 
 