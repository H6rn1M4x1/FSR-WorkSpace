const fs = require('fs');

const block1 = `Aceite de Girasol,Mercaderia,Dispensa,Cafe America,Lts.
Aceite de Oliva,Mercaderia,Dispensa,Cafe America,Lts.
Aceitunas Negras,Mercaderia,Fiambres,Chinos,Gr.
Aceitunas Verdes,Mercaderia,Fiambres,Chinos,Gr.
Acelga,Verdura,Frutas y Verduras,Verduleria,Atados
Agua Micelar,Mercaderia,Cuidado Personal,Cafe America,Uni
Ajo,Verdura,Frutas y Verduras,Verduleria,Atado/s
Alcaucil,Verdura,Frutas y Verduras,Verduleria,Uni.
Alitas de Pollo,Pollo,Heladera,Cafe America,Uni.
Arroz,Mercaderia,Granos,Cafe America,Kg.
Arroz Sofia,Mercaderia,Granos,Cafe America,Kg.
Arvejas,Mercaderia,Granos,Cafe America,Uni.
Asado de Carnicero,Carne,Carniceria,Cafe America,Kg.
Atado de Acelga,Verdura,Frutas y Verduras,Verduleria,Atado/s
Atado de Veteraba,Verdura,Frutas y Verduras,Verduleria,Atado/s
Azucar,Mercaderia,Dispensa,Cafe America,Kg.
Banana,Fruta,Frutas y Verduras,Verduleria,Uni.
Berenjena,Verdura,Frutas y Verduras,Verduleria,Uni.
Bicarbonato de Sodio,Mercaderia,Otros,Chinos,Gr.
Bife de Nalga,Carne,Carniceria,Cafe America,Kg.
Bifes de Cerdo,Cerdo,Carniceria,Cafe America,Kg.
Bifes de Pollo,Pollo,Carniceria,Cafe America,Kg.
Cafe Tostado y Molido,Mercaderia,Infusiones,Cafe America,Kg.
Caldo de Verduras,Mercaderia,Dispensa,Cafe America,Uni.
Camote,Verdura,Frutas y Verduras,Verduleria,Kg.
Cebolla Blanca,Verdura,Frutas y Verduras,Verduleria,Kg.
Cebolla Morada,Verdura,Frutas y Verduras,Verduleria,Kg.
Cepillo de Dientes,Mercaderia,Cuidado Personal,Cafe America,Uni.
Choclo,Verdura,Frutas y Verduras,Verduleria,Uni.
Choclo Congelado,Verdura,Heladera,Cafe America,Uni.
Chocolatada,Mercaderia,Infusiones,Cafe America,Uni.
Chorizos,Cerdo,Carniceria,Cafe America,Uni.
Colita de Cuadril,Carne,Carniceria,Cafe America,Kg.
Costeletas de Carne,Carne,Carniceria,Cafe America,Uni.
Costeletas de Cerdo,Cerdo,Carniceria,Cafe America,Uni.
Crema de Enjuague Grande,Mercaderia,Cuidado Personal,Cafe America,Uni.
Crema de Enjuague Mediana,Mercaderia,Cuidado Personal,Cafe America,Uni.
Crema de Enjuague Pequeña,Mercaderia,Cuidado Personal,Cafe America,Uni.
Crema de Leche Chico,Mercaderia,Heladera,Cafe America,Uni.
Crema de Leche Grande,Mercaderia,Heladera,Cafe America,Uni.
Crema de Leche Mediano,Mercaderia,Heladera,Cafe America,Uni.
Desodorante Gladys 48hs/72hs,Mercaderia,Cuidado Personal,Cafe America,Uni.
Desodorante Hernan 48hs/72hs,Mercaderia,Cuidado Personal,Cafe America,Uni.
Desodorante Jessica 48hs/72hs,Mercaderia,Cuidado Personal,Cafe America,Uni.
Desodorante Modesto 48hs/72hs,Mercaderia,Cuidado Personal,Cafe America,Uni.
Detergente para Platos,Mercaderia,Cuidados del Hogar,Cafe America,Uni.
Dicroicas,Mercaderia,Electronica,Cafe America,Uni.
Dulce de Cereza,Mercaderia,Dulces,Cafe America,Uni.
Dulce de Durazno,Mercaderia,Dulces,Cafe America,Uni.
Dulce de Frutilla,Mercaderia,Dulces,Cafe America,Uni.
Dulce de Higos,Mercaderia,Dulces,Cafe America,Uni.
Dulce de Leche,Mercaderia,Dulces,Cafe America,Uni.
Dulce de Naranja,Mercaderia,Dulces,Cafe America,Uni.
Durazno,Fruta,Frutas y Verduras,Verduleria,Kg.
Esponja de Lavar,Mercaderia,Cuidados del Hogar,Cafe America,Uni.
Facturas,Panificacion,Panificacion,Panaderia,Uni.
Fideos Cabello de Angel,Mercaderia,Harinas,Cafe America,Uni.
Fideos Coditos,Mercaderia,Harinas,Cafe America,Uni.
Fideos Gruesos,Mercaderia,Harinas,Cafe America,Uni.
Fideos Moñito,Mercaderia,Harinas,Cafe America,Uni.
Fideos Mostachol,Mercaderia,Harinas,Cafe America,Uni.
Fideos Secos,Mercaderia,Harinas,Cafe America,Uni.
Fideos Tallarin,Mercaderia,Harinas,Cafe America,Uni.
Fideos Tirabuzon,Mercaderia,Harinas,Cafe America,Uni.
Frutilla,Fruta,Frutas y Verduras,Verduleria,Kg.
Galletas de Avena,Mercaderia,Dulces,Cafe America,Uni.
Galletas de Miel,Mercaderia,Dulces,Cafe America,Uni.
Garvanzos,Mercaderia,Granos,Cafe America,Uni.
Gelatina Sin Sabor,Mercaderia,Dispensa,Cafe America,Uni.
Grasa Bovina,Mercaderia,Heladera,Cafe America,Kg.
Harina 0000,Mercaderia,Harinas,Cafe America,Kg.
Harina 000,Mercaderia,Harinas,Cafe America,Kg.
Harina Leudante,Mercaderia,Harinas,Cafe America,Kg.
Higado,Carne,Carniceria,Cafe America,Kg.
Huevo,Mercaderia,Dispensa,Cafe America,Uni.
Jabon para Lava Platos,Mercaderia,Cuidados del Hogar,Cafe America,Uni.
Jabon para Lavarropas,Mercaderia,Cuidados del Hogar,Cafe America,Uni.
Jabon para Tocador,Mercaderia,Cuidados del Hogar,Cafe America,Uni.
Jamon Cocido,Mercaderia,Fiambres,"Chinos, Lenic",Gr.
Jamon Crudo,Mercaderia,Fiambres,"Chinos, Lenic",Gr.
Jugos en Sobre,Mercaderia,Dispensa,Cafe America,Uni.
Ketchup Chica,Mercaderia,Ultra Procesados,Cafe America,Uni.
Ketchup Grande,Mercaderia,Ultra Procesados,Cafe America,Uni.
Ketchup Mediana,Mercaderia,Ultra Procesados,Cafe America,Uni.
Leche en Polvo,Mercaderia,Infusiones,Cafe America,Uni.
Lechuga,Verdura,Frutas y Verduras,Verduleria,Uni.
Lentejas,Mercaderia,Granos,Cafe America,Uni.
Levadura Seca (10Gr.),Mercaderia,Panificacion,Chinos,Uni.
Limpiador Para Piso,Mercaderia,Limpieza,Cafe America,Uni.
Lomo de Carne,Carne,Carniceria,Cafe America,Kg.
Lomo de Cerdo,Cerdo,Carniceria,Cafe America,Kg.
Maiz Blanco,Mercaderia,Granos,Cafe America,Uni.
Mandarina,Fruta,Frutas y Verduras,Verduleria,Uni.
Manteca,Mercaderia,Heladera,Cafe America,Uni.
Manza Verde,Fruta,Frutas y Verduras,Verduleria,Uni.
Manzana Roja,Fruta,Frutas y Verduras,Verduleria,Uni.
Maple de Huevo,Pollo,Dispensa,Chinos,Uni.
Margarina,Mercaderia,Heladera,Cafe America,Gr.
Matambre de Carne,Carne,Carniceria,Cafe America,Kg.
Matambre de Cerdo,Cerdo,Carniceria,Cafe America,Kg.
" Mate Cocido",Mercaderia,Infusiones,Cafe America,Uni.
Mayoliva,Mercaderia,Ultra Procesados,Cafe America,Uni.
Mayonesa Ahumada,Mercaderia,Ultra Procesados,Cafe America,Uni.
Mayonesa Chica,Mercaderia,Ultra Procesados,Cafe America,Uni.
Mayonesa Grande,Mercaderia,Ultra Procesados,Cafe America,Uni.
Mayonesa Mediana,Mercaderia,Ultra Procesados,Cafe America,Uni.
Medialunas,Panificacion,Panificacion,Panaderia,Uni.
Melon,Fruta,Frutas y Verduras,Verduleria,Uni.
Merluza (Pescado),Pescado,Carniceria,Cafe America,Kg.
Miel,Mercaderia,Dulces,Cafe America,Uni.
Molida Comun,Cerdo,Carniceria,Cafe America,Kg.
Molida Especial,Carne,Carniceria,Cafe America,Kg.
Mopa de Piso,Mercaderia,Limpieza,Cafe America,Uni.
Morcilla,Carne,Carniceria,Cafe America,Rosca/s
Mortadela,Mercaderia,Fiambres,Cafe America,Gr.
Mostaza Chica,Mercaderia,Ultra Procesados,Cafe America,Uni.
Mostaza Grande,Mercaderia,Ultra Procesados,Cafe America,Uni.
Mostaza Mediana,Mercaderia,Ultra Procesados,Cafe America,Uni.
Naranja,Fruta,Frutas y Verduras,Verduleria,Uni.
Nido de Spaghetti,Mercaderia,Harinas,Cafe America,Uni.
Paleta,Mercaderia,Fiambres,Cafe America,Gr.
Palillos,Mercaderia,Cuidados del Hogar,Cafe America,Uni.
Pan Blanco,Mercaderia,Panificacion,Cafe America,Kg.
Pan Cacero,Panificacion,Panificacion,Panaderia,Kg.
Pan de Miga Chico,Panificacion,Panificacion,Cafe America,Uni.
Pan de Miga Grande,Panificacion,Panificacion,Cafe America,Uni.
Pan en Bollos,Panificacion,Panificacion,Panaderia,Kg.
Pan Lactal,Mercaderia,Panificacion,Cafe America,Uni.
Pan Rayado,Panificacion,Panificacion,"Chinos, Lenic",Kg.
Panceta,Mercaderia,Fiambres,"Chinos, Lenic",Gr.
Panes de Hamburgesas,Mercaderia,Harinas,Cafe America,Uni.
Pañuelitos,Mercaderia,Cuidado Personal,Cafe America,Uni.
Papa,Verdura,Frutas y Verduras,Verduleria,Kg.
Papel Aluminio,Mercaderia,Dispensa,Cafe America,Uni.
Papel de Cocina,,,,
Papel Film Grande,Mercaderia,Dispensa,Cafe America,Uni.
Papel Higienico,Mercaderia,Cuidados del Hogar,Cafe America,Uni.
Pasta Dental Chica,Mercaderia,Cuidado Personal,Cafe America,Uni.
Pasta Dental Grande,Mercaderia,Cuidado Personal,Cafe America,Uni.
Pasta Dental Mediana,Mercaderia,Cuidado Personal,Cafe America,Uni.
Pata Muslo,Pollo,Carniceria,Cafe America,Uni.
Pechuga de Pollo,Pollo,Carniceria,Cafe America,Uni.
Pera,Fruta,Frutas y Verduras,Verduleria,Uni.
Perrejil,Verdura,Frutas y Verduras,Verduleria,Uni.
Pimiento Rojo,Verdura,Frutas y Verduras,Verduleria,Uni.
Pimiento Verde,Verdura,Frutas y Verduras,Verduleria,Uni.
Pimienton Rojo (Dulce),Mercaderia,Condimentos,Chinos,Gr.
Piña,Fruta,Frutas y Verduras,Verduleria,Gr.
Pollo Entero,Pollo,Carniceria,Cafe America,Uni.
Polvo de Hornear,Mercaderia,Otros,Chinos,Gr.
Porotos,Mercaderia,Granos,Cafe America,Uni.
Primavera,Mercaderia,Fiambres,"Chinos, Lenic",Gr.
Punta de Espalda,Carne,Carniceria,"Cafe America, Lenic",Kg.
Pure de Tomate,Verdura,Harinas,Cafe America,Uni.
Queso Azul,Mercaderia,Fiambres,"Chinos, Lenic",Gr.
Queso Chedar,Mercaderia,Fiambres,"Chinos, Lenic",Gr.
Queso Mantecoso,Mercaderia,Fiambres,Cafe America,Kg.
Queso Muzzarella,Mercaderia,Fiambres,Cafe America,Gr.
Queso Rayado,Mercaderia,Ultra Procesados,Cafe America,Uni.
Ravioles,Mercaderia,Heladera,Cafe America,Uni.
Sal Fina Bajo en Sodio,Mercaderia,Dispensa,Cafe America,Uni.
Salame,Mercaderia,Fiambres,"Chinos, Lenic",Gr.
Salchica Parillera,Carne,Otros,Lenic,Kg.
Salchicas,Mercaderia,Heladera,"Chinos, Lenic",Uni.
Salsa de Soja,Mercaderia,Dispensa,Cafe America,Uni.
Sandia,Fruta,Frutas y Verduras,Verduleria,Uni.
Servilletas,Mercaderia,Cuidados del Hogar,Cafe America,Uni.
Shampo Pantene Grande,Mercaderia,Cuidado Personal,Cafe America,Uni.
Shampo Pantene Mediana,Mercaderia,Cuidado Personal,Cafe America,Uni.
Shampo Pantene Pequeño,Mercaderia,Cuidado Personal,Cafe America,Uni.
Supremas,Pollo,Otros,Avicola,Kg.
Tapa de Asado,Carne,Carniceria,Cafe America,Kg.
Té Comun,Mercaderia,Infusiones,Cafe America,Uni.
Te Varios Sabores,Mercaderia,Infusiones,Cafe America,Uni.
Tomate,Fruta,Frutas y Verduras,Verduleria,Uni.
Tomillo,Mercaderia,Condimentos,Cafe America,Gr.
Uvas Moradas,Fruta,Frutas y Verduras,Verduleria,Kg.
Uvas Verdes,Fruta,Frutas y Verduras,Verduleria,Kg.
Yerba Mate,Mercaderia,Infusiones,Cafe America,Kg.
Zanahoria,Verdura,Frutas y Verduras,Verduleria,Kg.
Zapallitos,Verdura,Frutas y Verduras,Verduleria,Kg.
Zapallo,Verdura,Frutas y Verduras,Verduleria,Cuarto
Zapallo Ingles,Verdura,Frutas y Verduras,Verduleria,Cuarto`;

const block2 = `Papa,Verdura,Verduleria,Frutas y Verduras,Kg.
Zanahoria,Verdura,Verduleria,Frutas y Verduras,Kg.
Zapallo,Verdura,Verduleria,Frutas y Verduras,Cuarto
Atado de Acelga,Verdura,Verduleria,Frutas y Verduras,Atado/s
Zapallitos,Verdura,Verduleria,Frutas y Verduras,Kg.
Camote,Verdura,Verduleria,Frutas y Verduras,Kg.
Cebolla Blanca,Verdura,Verduleria,Frutas y Verduras,Kg.
Cebolla Morada,Verdura,Verduleria,Frutas y Verduras,Kg.
Zapallo Ingles,Verdura,Verduleria,Frutas y Verduras,Cuarto
Ajo,Verdura,Verduleria,Frutas y Verduras,Atado/s
Perrejil,Verdura,Verduleria,Frutas y Verduras,Uni.
Lechuga,Verdura,Verduleria,Frutas y Verduras,Uni.
Tomate,Fruta,Verduleria,Frutas y Verduras,Uni.
Pimiento Rojo,Verdura,Verduleria,Frutas y Verduras,Uni.
Pimiento Verde,Verdura,Verduleria,Frutas y Verduras,Uni.
Berenjena,Verdura,Verduleria,Frutas y Verduras,Uni.
Atado de Veteraba,Verdura,Verduleria,Frutas y Verduras,Atado/s
Manzana Roja,Fruta,Verduleria,Frutas y Verduras,Uni.
Pera,Fruta,Verduleria,Frutas y Verduras,Uni.
Banana,Fruta,Verduleria,Frutas y Verduras,Uni.
Durazno,Fruta,Verduleria,Frutas y Verduras,Kg.
Manza Verde,Fruta,Verduleria,Frutas y Verduras,Uni.
Sandia,Fruta,Verduleria,Frutas y Verduras,Uni.
Piña,Fruta,Verduleria,Frutas y Verduras,Gr.
Melon,Fruta,Verduleria,Frutas y Verduras,Uni.
Uvas Verdes,Fruta,Verduleria,Frutas y Verduras,Kg.
Naranja,Fruta,Verduleria,Frutas y Verduras,Uni.
Mandarina,Fruta,Verduleria,Frutas y Verduras,Uni.
Frutilla,Fruta,Verduleria,Frutas y Verduras,Kg.
Uvas Moradas,Fruta,Verduleria,Frutas y Verduras,Kg.
Bife de Nalga,Carne,Cafe America,Carniceria,Kg.
Tapa de Asado,Carne,Cafe America,Carniceria,Kg.
Asado de Carnicero,Carne,Cafe America,Carniceria,Kg.
Matambre de Carne,Carne,Cafe America,Carniceria,Kg.
Lomo de Carne,Carne,Cafe America,Carniceria,Kg.
Chorizos,Cerdo,Cafe America,Carniceria,Uni.
Lomo de Cerdo,Cerdo,Cafe America,Carniceria,Kg.
Matambre de Cerdo,Cerdo,Cafe America,Carniceria,Kg.
Punta de Espalda,Carne,"Cafe America, Lenic",Carniceria,Kg.
Colita de Cuadril,Carne,Cafe America,Carniceria,Kg.
Costeletas de Carne,Carne,Cafe America,Carniceria,Uni.
Costeletas de Cerdo,Cerdo,Cafe America,Carniceria,Uni.
Higado,Carne,Cafe America,Carniceria,Kg.
Molida Especial,Carne,Cafe America,Carniceria,Kg.
Molida Comun,Cerdo,Cafe America,Carniceria,Kg.
Bifes de Cerdo,Cerdo,Cafe America,Carniceria,Kg.
Pechuga de Pollo,Pollo,Cafe America,Carniceria,Uni.
Pollo Entero,Pollo,Cafe America,Carniceria,Uni.
Alitas de Pollo,Pollo,Cafe America,Heladera,Uni.
Pata Muslo,Pollo,Cafe America,Carniceria,Uni.
Supremas,Pollo,Avicola,Otros,Kg.
Salchica Parillera,Carne,Lenic,Otros,Kg.
Arroz,Mercaderia,Cafe America,Granos,Kg.
Arroz Sofia,Mercaderia,Cafe America,Granos,Kg.
Fideos Tallarin,Mercaderia,Cafe America,Harinas,Uni.
Fideos Moñito,Mercaderia,Cafe America,Harinas,Uni.
Fideos Cabello de Angel,Mercaderia,Cafe America,Harinas,Uni.
Fideos Secos,Mercaderia,Cafe America,Harinas,Uni.
Fideos Mostachol,Mercaderia,Cafe America,Harinas,Uni.
Fideos Coditos,Mercaderia,Cafe America,Harinas,Uni.
Fideos Gruesos,Mercaderia,Cafe America,Harinas,Uni.
Choclo Congelado,Verdura,Cafe America,Heladera,Uni.
Ravioles,Mercaderia,Cafe America,Heladera,Uni.
Choclo,Verdura,Verduleria,Frutas y Verduras,Uni.
Pure de Tomate,Verdura,Cafe America,Harinas,Uni.
Panes de Hamburgesas,Mercaderia,Cafe America,Harinas,Uni.
Pan Lactal,Mercaderia,Cafe America,Panificacion,Uni.
Pan Blanco,Mercaderia,Cafe America,Panificacion,Kg.
Desodorante Jessica 48hs/72hs,Mercaderia,Cafe America,Cuidado Personal,Uni.
Desodorante Hernan 48hs/72hs,Mercaderia,Cafe America,Cuidado Personal,Uni.
Desodorante Modesto 48hs/72hs,Mercaderia,Cafe America,Cuidado Personal,Uni.
Desodorante Gladys 48hs/72hs,Mercaderia,Cafe America,Cuidado Personal,Uni.
Agua Micelar,Mercaderia,Cafe America,Cuidado Personal,Uni
Mayonesa Grande,Mercaderia,Cafe America,Ultra Procesados,Uni.
Mayonesa Mediana,Mercaderia,Cafe America,Ultra Procesados,Uni.
Mayonesa Chica,Mercaderia,Cafe America,Ultra Procesados,Uni.
Ketchup Grande,Mercaderia,Cafe America,Ultra Procesados,Uni.
Ketchup Mediana,Mercaderia,Cafe America,Ultra Procesados,Uni.
Ketchup Chica,Mercaderia,Cafe America,Ultra Procesados,Uni.
Mostaza Grande,Mercaderia,Cafe America,Ultra Procesados,Uni.
Mostaza Mediana,Mercaderia,Cafe America,Ultra Procesados,Uni.
Mostaza Chica,Mercaderia,Cafe America,Ultra Procesados,Uni.
Mayonesa Ahumada,Mercaderia,Cafe America,Ultra Procesados,Uni.
Mayoliva,Mercaderia,Cafe America,Ultra Procesados,Uni.
Pan Cacero,Panificacion,Panaderia,Panificacion,Kg.
Pan en Bollos,Panificacion,Panaderia,Panificacion,Kg.
Medialunas,Panificacion,Panaderia,Panificacion,Uni.
Facturas,Panificacion,Panaderia,Panificacion,Uni.
Queso Rayado,Mercaderia,Cafe America,Ultra Procesados,Uni.
Lentejas,Mercaderia,Cafe America,Granos,Uni.
Porotos,Mercaderia,Cafe America,Granos,Uni.
Harina 000,Mercaderia,Cafe America,Harinas,Kg.
Harina 0000,Mercaderia,Cafe America,Harinas,Kg.
Harina Leudante,Mercaderia,Cafe America,Harinas,Kg.
Aceite de Girasol,Mercaderia,Cafe America,Dispensa,Lts.
Aceite de Oliva,Mercaderia,Cafe America,Dispensa,Lts.
Té Comun,Mercaderia,Cafe America,Infusiones,Uni.
Te Varios Sabores,Mercaderia,Cafe America,Infusiones,Uni.
Azucar,Mercaderia,Cafe America,Dispensa,Kg.
Sal Fina Bajo en Sodio,Mercaderia,Cafe America,Dispensa,Uni.
Jugos en Sobre,Mercaderia,Cafe America,Dispensa,Uni.
Caldo de Verduras,Mercaderia,Cafe America,Dispensa,Uni.
Servilletas,Mercaderia,Cafe America,Cuidados del Hogar,Uni.
Papel Higienico,Mercaderia,Cafe America,Cuidados del Hogar,Uni.
Pañuelitos,Mercaderia,Cafe America,Cuidado Personal,Uni.
Detergente para Platos,Mercaderia,Cafe America,Cuidados del Hogar,Uni.
Jabon para Tocador,Mercaderia,Cafe America,Cuidados del Hogar,Uni.
Jabon para Lavarropas,Mercaderia,Cafe America,Cuidados del Hogar,Uni.
Pasta Dental Chica,Mercaderia,Cafe America,Cuidado Personal,Uni.
Pasta Dental Mediana,Mercaderia,Cafe America,Cuidado Personal,Uni.
Pasta Dental Grande,Mercaderia,Cafe America,Cuidado Personal,Uni.
Shampo Pantene Grande,Mercaderia,Cafe America,Cuidado Personal,Uni.
Shampo Pantene Mediana,Mercaderia,Cafe America,Cuidado Personal,Uni.
Shampo Pantene Pequeño,Mercaderia,Cafe America,Cuidado Personal,Uni.
Crema de Enjuague Grande,Mercaderia,Cafe America,Cuidado Personal,Uni.
Crema de Enjuague Mediana,Mercaderia,Cafe America,Cuidado Personal,Uni.
Crema de Enjuague Pequeña,Mercaderia,Cafe America,Cuidado Personal,Uni.
Palillos,Mercaderia,Cafe America,Cuidados del Hogar,Uni.
Dicroicas,Mercaderia,Cafe America,Electronica,Uni.
Chocolatada,Mercaderia,Cafe America,Infusiones,Uni.
Cafe Tostado y Molido,Mercaderia,Cafe America,Infusiones,Kg.
Crema de Leche Grande,Mercaderia,Cafe America,Heladera,Uni.
Crema de Leche Mediano,Mercaderia,Cafe America,Heladera,Uni.
Crema de Leche Chico,Mercaderia,Cafe America,Heladera,Uni.
Manteca,Mercaderia,Cafe America,Heladera,Uni.
Margarina,Mercaderia,Cafe America,Heladera,Gr.
Polvo de Hornear,Mercaderia,Chinos,Otros,Gr.
Bicarbonato de Sodio,Mercaderia,Chinos,Otros,Gr.
Gelatina Sin Sabor,Mercaderia,Cafe America,Dispensa,Uni.
Dulce de Leche,Mercaderia,Cafe America,Dulces,Uni.
Dulce de Frutilla,Mercaderia,Cafe America,Dulces,Uni.
Dulce de Durazno,Mercaderia,Cafe America,Dulces,Uni.
Dulce de Naranja,Mercaderia,Cafe America,Dulces,Uni.
Dulce de Higos,Mercaderia,Cafe America,Dulces,Uni.
Dulce de Cereza,Mercaderia,Cafe America,Dulces,Uni.
Cepillo de Dientes,Mercaderia,Cafe America,Cuidado Personal,Uni.
Jabon para Lava Platos,Mercaderia,Cafe America,Cuidados del Hogar,Uni.
Galletas de Avena,Mercaderia,Cafe America,Dulces,Uni.
Galletas de Miel,Mercaderia,Cafe America,Dulces,Uni.
Queso Mantecoso,Mercaderia,Cafe America,Fiambres,Kg.
Queso Chedar,Mercaderia,"Chinos, Lenic",Fiambres,Gr.
Queso Muzzarella,Mercaderia,Cafe America,Fiambres,Gr.
Queso Azul,Mercaderia,"Chinos, Lenic",Fiambres,Gr.
Salame,Mercaderia,"Chinos, Lenic",Fiambres,Gr.
Paleta,Mercaderia,Cafe America,Fiambres,Gr.
Mortadela,Mercaderia,Cafe America,Fiambres,Gr.
Primavera,Mercaderia,"Chinos, Lenic",Fiambres,Gr.
Jamon Cocido,Mercaderia,"Chinos, Lenic",Fiambres,Gr.
Jamon Crudo,Mercaderia,"Chinos, Lenic",Fiambres,Gr.
Panceta,Mercaderia,"Chinos, Lenic",Fiambres,Gr.
Pan de Miga Grande,Panificacion,Cafe America,Panificacion,Uni.
Pan de Miga Chico,Panificacion,Cafe America,Panificacion,Uni.
Aceitunas Verdes,Mercaderia,Chinos,Fiambres,Gr.
Aceitunas Negras,Mercaderia,Chinos,Fiambres,Gr.
Salchicas,Mercaderia,"Chinos, Lenic",Heladera,Uni.
Miel,Mercaderia,Cafe America,Dulces,Uni.
Leche en Polvo,Mercaderia,Cafe America,Infusiones,Uni.
" Mate Cocido",Mercaderia,Cafe America,Infusiones,Uni.
Yerba Mate,Mercaderia,Cafe America,Infusiones,Kg.
Pan Rayado,Panificacion,"Chinos, Lenic",Panificacion,Kg.
Maple de Huevo,Pollo,Chinos,Dispensa,Uni.
Mopa de Piso,Mercaderia,Cafe America,Limpieza,Uni.
Esponja de Lavar,Mercaderia,Cafe America,Cuidados del Hogar,Uni.
Acelga,Verdura,Verduleria,Frutas y Verduras,Atados
Huevo,Mercaderia,Cafe America,Dispensa,Uni.
Nido de Spaghetti,Mercaderia,Cafe America,Harinas,Uni.
Salsa de Soja,Mercaderia,Cafe America,Dispensa,Uni.
Pimienton Rojo (Dulce),Mercaderia,Chinos,Condimentos,Gr.
Tomillo,Mercaderia,Cafe America,Condimentos,Gr.
Bifes de Pollo,Pollo,Cafe America,Carniceria,Kg.
Alcaucil,Verdura,Verduleria,Frutas y Verduras,Uni.
Morcilla,Carne,Cafe America,Carniceria,Rosca/s
Grasa Bovina,Mercaderia,Cafe America,Heladera,Kg.
Levadura Seca (10Gr.),Mercaderia,Chinos,Panificacion,Uni.
Arvejas,Mercaderia,Cafe America,Granos,Uni.
Maiz Blanco,Mercaderia,Cafe America,Granos,Uni.
Fideos Tirabuzon,Mercaderia,Cafe America,Harinas,Uni.
Garvanzos,Mercaderia,Cafe America,Granos,Uni.
Papel de Cocina,,,,
Limpiador Para Piso,Mercaderia,Cafe America,Limpieza,Uni.
Papel Film Grande,Mercaderia,Cafe America,Dispensa,Uni.
Papel Aluminio,Mercaderia,Cafe America,Dispensa,Uni.
Merluza (Pescado),Pescado,Cafe America,Carniceria,Kg.`;

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

const map = new Map();

// Parse Block 1: Ingrediente,Categoria,Sector,Comercio,Unidad de Medida
block1.split('\\n').forEach(line => {
  const cleanLine = line.trim();
  if (!cleanLine) return;
  const parts = parseCSVLine(cleanLine);
  if (parts.length < 5) return;
  const item = {
    ingredientes: parts[0],
    categoria: parts[1],
    sector: parts[2],
    comercio: parts[3],
    unidadMedida: parts[4]
  };
  const key = item.ingredientes.trim().toLowerCase();
  if (key) {
    map.set(key, item);
  }
});

// Parse Block 2: Ingrediente,Categoria,Comercio,Sector,Unidad de Medida
// If key already exists, block 2's info might update or keep the existing one. Let's merge them!
block2.split('\\n').forEach(line => {
  const cleanLine = line.trim();
  if (!cleanLine) return;
  const parts = parseCSVLine(cleanLine);
  if (parts.length < 5) return;
  const item = {
    ingredientes: parts[0],
    categoria: parts[1],
    comercio: parts[2],
    sector: parts[3],
    unidadMedida: parts[4]
  };
  const key = item.ingredientes.trim().toLowerCase();
  if (key) {
    // If it already exists, merge fields to choose the more specific/correct ones (prefer non-empty and well-formed)
    if (map.has(key)) {
      const existing = map.get(key);
      const merged = {
        ingredientes: item.ingredientes || existing.ingredientes,
        categoria: item.categoria || existing.categoria,
        sector: item.sector || existing.sector,
        comercio: item.comercio || existing.comercio,
        unidadMedida: item.unidadMedida || existing.unidadMedida
      };
      map.set(key, merged);
    } else {
      map.set(key, item);
    }
  }
});

const itemsList = Array.from(map.values());

// Generate the TS Array code
let idCounter = 1;
const resultItems = itemsList.map(item => {
  return {
    id: `mer-${idCounter++}`,
    ingredientes: item.ingredientes,
    categoria: item.categoria || "Otros",
    sector: item.sector || "Dispensa",
    comercio: item.comercio || "Chinos",
    unidadMedida: item.unidadMedida || "Uni."
  };
});

fs.writeFileSync('/tmp/parsed_mercaderia.json', JSON.stringify(resultItems, null, 2));
console.log('Successfully processed ' + resultItems.length + ' unique items!');
