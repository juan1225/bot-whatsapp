const { ActualizaMapa } = require('../adapter')

const validarItem = async (cel,codigo,cantidad,nota) => {

    var sql  = `select *, sale_price*${cantidad} total  from tbl_food_menus WHERE code = '${codigo}' and del_status = 'Live'`
    var mat = await ActualizaMapa(sql)  

    if(mat.length >0){
        var sql = `INSERT INTO tmp_ped_wts (celular,codigo,item,cantidad,valor,nota,fecha) 
        VALUES ('${cel}','${codigo}','${mat[0].name}','${cantidad}','${mat[0].sale_price}','${nota}',CURDATE())`
    await ActualizaMapa(sql)     

    var sql = `SELECT sum(valor*cantidad) total FROM tmp_ped_wts WHERE celular ='${cel}'`
    var t_v = await ActualizaMapa(sql) 
    const t = format(t_v[0].total)

    var msn = `*PRODUCTO:* ${mat[0].name} \n*NOTA:* ${nota} \n*CANTIDAD:* ${cantidad} \n*VALOR / U:* $${format(mat[0].sale_price)} \n*TOTAL:* $${format(mat[0].total)} \n*TOTAL A PAGAR: $${format(t_v[0].total)}*`
    var step = 'STEP_5_1'

    }else{

    var msn = `Codigo * ${codigo} * no encontrado por favor verifique`
    var step = 'STEP_5_2'

    }   

    return {
        step : step,
        msn : msn
    }

}

const deleteItem = async (from,item) => {   

    await ActualizaMapa(`delete from tmp_ped_wts WHERE celular = '${from}' and id = '${item}'`); 
    await ActualizaMapa("UPDATE initial SET estado = 'A' where telefono = '"+from+"' and option_key = 'STEP_11'");
    await ActualizaMapa("UPDATE initial SET estado = 'P' where telefono = '"+from+"' and option_key = 'STEP_5'");

}

const crear_cliente = async (from,message,campo) => {

    const cust =  await ActualizaMapa(`select * from tbl_customers WHERE phone = '${from.replace(/57|@c.us/g, '')}'`); 

    if(campo == 'STEP_3'){
        if(cust.length>0){

            await ActualizaMapa(`UPDATE tbl_customers SET name ='${message.toLowerCase()}' WHERE phone = '${from.replace(/57|@c.us/g, '')}'`);

        }else{

            await ActualizaMapa(`INSERT INTO tbl_customers (name,phone,del_status,created)
            VALUES ('${message.toLowerCase()}','${from.replace(/57|@c.us/g, '')}','Live',curdate())`);           
            
        }
        await ActualizaMapa(`UPDATE initial SET estado = 'A' where telefono = '${from}' and option_key in('${campo}')`); 
        return 'STEP_4'
    }else if(campo == 'STEP_4'){

       await ActualizaMapa(`UPDATE initial SET estado = 'A' where telefono = '${from}' and option_key in('${campo}')`); 
       await ActualizaMapa(`UPDATE tbl_customers SET address ='${message}' WHERE phone = '${from.replace(/57|@c.us/g, '')}'`); 
       return 'STEP_5'

    }

}

const finalizar_orden = async (from,outlet) => {

    const id_cli  = await ActualizaMapa(`SELECT id FROM tbl_customers WHERE phone ='${from.replace(/57|@c.us/g, '')}' order by 1  desc limit 1`); 
    const sale_id = await ActualizaMapa(`INSERT INTO tbl_sales (sale_no,customer_id,total_items,sub_total,vat,total_payable,close_time,total_item_discount_amount,sub_total_with_discount,sub_total_discount_amount,total_discount_amount,delivery_charge,sub_total_discount_value,sub_total_discount_type,sale_date,date_time,order_time,modified,user_id,waiter_id,outlet_id,order_status,order_type,del_status,domiciliary_id,pre_invoice,delivery_status,percentage_service,liquidado,screen_closes)
	VALUES ('','${id_cli[0].id}',0,0.0,0.0,0.0,'00:00:00',0.0,0.0,0.0,0.0,0.0,'0','0',curdate(),now(),time(NOW()),'No',0,1,${outlet},1,3,'Live',0,'0','P',0.0,'NO',1)`);
    const orden  = await ActualizaMapa(`select *,valor *cantidad total  from tmp_ped_wts`); 

    orden.forEach( async e => {
        await ActualizaMapa(`INSERT INTO tbl_sales_details (food_menu_id,menu_name,qty,menu_price_without_discount,menu_price_with_discount,menu_unit_price,menu_vat_percentage,menu_taxes,discount_type,menu_note,discount_amount,item_type,cooking_start_time,sales_id,outlet_id,del_status,sync,mp3,cons_ptl)
	    select id,name,${e.cantidad},${e.total},${e.total},${e.valor},0,0,'plain','${e.nota}',0,screen,now(),${sale_id.insertId},${outlet},'Live',0,1,0  from tbl_food_menus where code = ${e.codigo}`); 
    });

    const mns = await factura(sale_id.insertId,from)
    await ActualizaMapa(`DELETE from initial WHERE telefono = '${from}' `); 
    await ActualizaMapa(`DELETE from tmp_ped_wts WHERE celular = '${from}' `); 

  return mns

}

const productos = async () => {

    var items = await ActualizaMapa("SELECT  code,name,sale_price from tbl_food_menus  where del_status = 'Live' and sale_price >0  order by category_id, name LIMIT 50");
    let lista = []
    var i = 0
    items.forEach(e => {        
        lista[i] = {id:e.code,title:e.name+'||$'+format(e.sale_price)+'||'+e.code}       
        i++
      });
     return lista

}

const productos_del = async (numero) => {

    var items = await ActualizaMapa(`select CAST(id as CHAR) id ,item  from tmp_ped_wts WHERE celular = '${numero}'`);
    let lista = []
    var i = 0
    items.forEach(e => {        
        lista[i] = {id:e.id,title:e.item+'||'+e.id}       
        i++
      });
     return lista

}

const inst_producto = async (from,message,acc) => {

    if(acc == 'N'){

        var items = message.split('||')

        var sql  = `select *  from tbl_food_menus WHERE code = '${items[2]}' and del_status = 'Live' limit 1`
        var mat = await ActualizaMapa(sql)  

        var sql = `INSERT INTO tmp_ped_wts (celular,codigo,item,valor,fecha) 
        VALUES ('${from}','${items[2]}','${mat[0].name}','${mat[0].sale_price}',CURDATE())`

        await ActualizaMapa(sql)

        var msn = `⚡Ingresa la cantida y preciona enviar\n ⚡ó si tiene una nota como por ejemplo termino 3/4 o jugo sin azucar ingrese de la sigiente manera *separado por un guion* y precione enviar.\n*CANTIDAD-NOTA*\n *➡️ 1-sin azucar*`
        var step = 'STEP_14'

    }else if(acc == 'C'){

        var items = message.split('-')
        var nota = items.length == 2 ? items[1] : ''

        var sql  = `select *,valor*cantidad total  from tmp_ped_wts WHERE cantidad is null and celular = '${from}'`
        var mat = await ActualizaMapa(sql)  

        await ActualizaMapa(`UPDATE tmp_ped_wts SET cantidad = '${message[0]}' ,nota = '${nota}' where id = '${mat[0].id}' `) 

        var sql  = `select *,valor*cantidad total  from tmp_ped_wts WHERE celular = '${from}' and id = '${mat[0].id}'`
        var mat = await ActualizaMapa(sql)  

        var sql = `SELECT sum(valor*cantidad) total FROM tmp_ped_wts WHERE celular ='${from}' `
        var t_v = await ActualizaMapa(sql) 
    
        console.log("******************errorr***************************",mat)
        var msn = `*PRODUCTO:* ${mat[0].item} \n*NOTA:* ${nota} \n*CANTIDAD:* ${items[0]} \n*VALOR / U:* $${format(mat[0].valor)} \n*TOTAL:* $${format(mat[0].total)} \n\n*TOTAL A PAGAR: $${format(t_v[0].total)}*`
        var step = 'STEP_5_1'

    }

    return {step : step,msn : msn}
}

const orden = async (from) => {

    var mat_ped = await ActualizaMapa("SELECT * FROM tmp_ped_wts WHERE celular = '"+from+"'");   
    var total   = await ActualizaMapa("SELECT SUM(valor*cantidad) total  from tmp_ped_wts  WHERE celular = '"+from+"'");
    var items   = ''
    mat_ped.forEach(e => {        
        items += `*${e.cantidad} - ${e.item}*\n*NOTA:* ${e.nota} \n*VALOR/U:* ${format(e.valor)} \n*TOTAL:* ${format(e.valor*e.cantidad)} \n\n`;
      });

     var texto = '\n\n**Ingrese mas producto o finalice la orden.*'
     return items+"*_TOTAL A PAGAR: $"+format(total[0].total)+"_*"+texto
}

const factura = async (sale_id,from) => {
    var mat_ped = await ActualizaMapa("SELECT menu_name item,food_menu_id codigo,menu_note nota,qty cantidad,menu_unit_price valor,menu_price_without_discount total FROM tbl_sales_details WHERE sales_id = '"+sale_id+"'");
    var total = await ActualizaMapa("SELECT SUM(menu_price_without_discount) total  from tbl_sales_details  WHERE sales_id = '"+sale_id+"'");

    const cust  =  await ActualizaMapa(`select * from tbl_customers WHERE phone = '${from.replace(/57|@c.us/g, '')}'`); 
    var cliente = `*Cliente:* ${cust[0].name.toUpperCase()}\n*Direrccion:* ${cust[0].address}\n\n`
    var items   = '*⚡RESUMEN DEL PEDIDO⚡* \n\n'+cliente
    mat_ped.forEach(e => {        
        items += `*${e.cantidad} - ${e.item}* \n*NOTA:* ${e.nota} \n*VALOR/U:* ${format(e.valor)} \n*TOTAL:* ${format(e.total)} \n\n`;
      });

      var texto = '\n\n*la orden fue enviada con exito.\n\nNOTA: El valor del domicilio *no esta incluido en la orden*, tiene un valor de *entre $5.000 a $10.000 pesos*\n\n⚡Gracias por su compra⚡'
 
     return items+"*_TOTAL A PAGAR: $"+format(total[0].total)+"_*"+texto
}

const LimpiaDatabase = async(numero) =>{
    var sql = `DELETE FROM initial WHERE telefono ='${numero}' `
    await ActualizaMapa(sql)  
    
    var sql = `DELETE FROM tmp_ped_wts WHERE celular ='${numero}' ` 
    await ActualizaMapa(sql) 
}


function format(valor){
   return new Intl.NumberFormat('es-MX').format( valor );
}


module.exports = { validarItem, deleteItem, orden, finalizar_orden, crear_cliente, productos, inst_producto, productos_del, LimpiaDatabase }