import { MercaderiaItem, ValoresNutricionales, AlimentoItem, PlatoItem } from "../types";

export const generarNutricionEstimada = (nombre: string, categoria: string = ""): ValoresNutricionales => {
  const n = nombre.toLowerCase();
  const c = categoria.toLowerCase();

  // 1. Oils, fats, butter, mayonnaise, olive oil
  if (n.includes("aceite") || n.includes("manteca") || n.includes("grasa") || n.includes("mayonesa") || n.includes("margarina")) {
    if (n.includes("aceite de oliva") || n.includes("aceite de girasol")) {
      return {
        grasas: 99.8,
        proteinas: 0,
        carbohidratos: 0,
        azucares: 0,
        fibra: 0,
        sodio: 0,
      };
    }
    return {
      grasas: 80,
      proteinas: 0.5,
      carbohidratos: 0,
      azucares: 0,
      fibra: 0,
      sodio: 15,
    };
  }

  // 2. High-fat meats (Asado, Vacio, Cerdo, Cordero, Chorizo, Morcilla, Salchicha)
  if (n.includes("vacio") || n.includes("costilla") || n.includes("asado") || n.includes("cerdo") || n.includes("chorizo") || n.includes("morcilla") || n.includes("salchicha") || n.includes("panceta") || n.includes("bacon")) {
    return {
      grasas: 22,
      proteinas: 18,
      carbohidratos: 0.5,
      azucares: 0.1,
      fibra: 0,
      sodio: 450,
    };
  }

  // 3. Lean meats, beef, mince, etc.
  if (n.includes("carne") || n.includes("molida") || n.includes("blanda") || n.includes("bife") || n.includes("lomo") || n.includes("peceto") || n.includes("milanesa") || c.includes("carne") || c.includes("carniceria")) {
    return {
      grasas: 8,
      proteinas: 22,
      carbohidratos: 0,
      azucares: 0,
      fibra: 0,
      sodio: 65,
    };
  }

  // 4. Poultry (Chicken, Turkey, Breast, etc.)
  if (n.includes("pollo") || n.includes("pechuga") || n.includes("pata") || n.includes("muslo") || n.includes("pavo")) {
    return {
      grasas: 4.5,
      proteinas: 23,
      carbohidratos: 0,
      azucares: 0,
      fibra: 0,
      sodio: 75,
    };
  }

  // 5. Fish & Seafood (Merluza, Atun, Salmon, Camaron)
  if (n.includes("pescado") || n.includes("merluza") || n.includes("atun") || n.includes("salmon") || n.includes("camaron") || c.includes("pescado")) {
    const isAtun = n.includes("atun");
    return {
      grasas: isAtun ? 1.5 : 5,
      proteinas: isAtun ? 24 : 18,
      carbohidratos: 0,
      azucares: 0,
      fibra: 0,
      sodio: isAtun ? 350 : 80,
    };
  }

  // 6. Eggs
  if (n.includes("huevo")) {
    return {
      grasas: 11,
      proteinas: 13,
      carbohidratos: 1,
      azucares: 0.5,
      fibra: 0,
      sodio: 120,
    };
  }

  // 7. Cheese, creamy dairy (Queso, Muzzarella, Cheddar, Ricota)
  if (n.includes("queso") || n.includes("muzzarella") || n.includes("mantecoso") || n.includes("cheddar") || n.includes("ricota") || n.includes("provolone") || n.includes("parmesano")) {
    return {
      grasas: 24,
      proteinas: 22,
      carbohidratos: 1.5,
      azucares: 0.5,
      fibra: 0,
      sodio: 500,
    };
  }

  // 8. Other dairy (Leche, Crema, Yogur)
  if (n.includes("leche") || n.includes("crema") || n.includes("yogur") || c.includes("lacteo") || c.includes("lácteo")) {
    const isCrema = n.includes("crema");
    return {
      grasas: isCrema ? 30 : 3,
      proteinas: isCrema ? 2 : 3.3,
      carbohidratos: isCrema ? 3 : 4.7,
      azucares: isCrema ? 3 : 4.5,
      fibra: 0,
      sodio: isCrema ? 35 : 45,
    };
  }

  // 9. Pasta, flour, rice, bread, cereal, grains (Fideo, Arroz, Harina, Pan, Factura, Galleta, Avena)
  if (n.includes("fideo") || n.includes("arroz") || n.includes("harina") || n.includes("pan") || n.includes("factura") || n.includes("galleta") || n.includes("galletita") || n.includes("avena") || n.includes("cereal") || n.includes("tallarines") || n.includes("polenta") || n.includes("ñoqui") || c.includes("granos") || c.includes("panaderia") || c.includes("panadería")) {
    const isPanGalleta = n.includes("pan") || n.includes("galleta") || n.includes("galletita");
    return {
      grasas: isPanGalleta ? 3.5 : 1.2,
      proteinas: isPanGalleta ? 8 : 7.5,
      carbohidratos: isPanGalleta ? 55 : 75,
      azucares: isPanGalleta ? 4 : 1.5,
      fibra: isPanGalleta ? 3 : 2.5,
      sodio: isPanGalleta ? 400 : 5,
    };
  }

  // 10. Legumes (Lentejas, Garbanzos, Porotos, Soja, Arvejas)
  if (n.includes("lenteja") || n.includes("garbanzo") || n.includes("poroto") || n.includes("frijol") || n.includes("soja") || n.includes("legumbre") || n.includes("arveja")) {
    return {
      grasas: 1.5,
      proteinas: 22,
      carbohidratos: 50,
      azucares: 2.5,
      fibra: 12,
      sodio: 10,
    };
  }

  // 11. Sugar, Honey, Sweet (Dulce, Azucar, Miel, Mermelada, Dulce de leche)
  if (n.includes("dulce") || n.includes("azucar") || n.includes("miel") || n.includes("mermelada") || n.includes("chocolate") || n.includes("cacao")) {
    const isAzucar = n.includes("azucar");
    return {
      grasas: n.includes("chocolate") ? 30 : 0.1,
      proteinas: n.includes("chocolate") ? 5 : 0.3,
      carbohidratos: isAzucar ? 99.8 : 75,
      azucares: isAzucar ? 99.8 : 70,
      fibra: n.includes("chocolate") ? 5 : 0.5,
      sodio: 10,
    };
  }

  // 12. Nuts & Seeds (Nuez, Almendra, Mani, Semilla, Castaña, Pistacho)
  if (n.includes("nuez") || n.includes("almendra") || n.includes("mani") || n.includes("semilla") || n.includes("castaña") || n.includes("frutos secos") || n.includes("pistacho") || n.includes("sesamo") || n.includes("chia")) {
    return {
      grasas: 48,
      proteinas: 18,
      carbohidratos: 16,
      azucares: 4,
      fibra: 7.5,
      sodio: 5,
    };
  }

  // 13. Leafy greens & High fiber veg (Acelga, Espinaca, Lechuga, Brocoli, Repollo, Rúcula)
  if (n.includes("acelga") || n.includes("espinaca") || n.includes("lechuga") || n.includes("brocoli") || n.includes("repollo") || n.includes("atado") || n.includes("rúcula")) {
    return {
      grasas: 0.2,
      proteinas: 1.8,
      carbohidratos: 2.5,
      azucares: 0.8,
      fibra: 2.6,
      sodio: 40,
    };
  }

  // 14. Fruits (Manzana, Platano, Banana, Naranja, Pera, Uva, Durazno, Fruta)
  if (n.includes("manzana") || n.includes("platano") || n.includes("banana") || n.includes("naranja") || n.includes("pera") || n.includes("uva") || n.includes("durazno") || n.includes("frutilla") || n.includes("limon") || c.includes("fruta")) {
    const isBanana = n.includes("banana") || n.includes("platano");
    return {
      grasas: 0.2,
      proteinas: isBanana ? 1.2 : 0.5,
      carbohidratos: isBanana ? 22 : 12,
      azucares: isBanana ? 12 : 10,
      fibra: isBanana ? 2.6 : 2.2,
      sodio: 1,
    };
  }

  // 15. Other Vegetables (Tomate, Cebolla, Zanahoria, Zapallo, Papa, Batata, Choclo, Berenjena, Calahorra)
  if (n.includes("tomate") || n.includes("cebolla") || n.includes("zanahoria") || n.includes("zapallo") || n.includes("papa") || n.includes("batata") || n.includes("choclo") || n.includes("berenjena") || n.includes("pimiento") || n.includes("morron") || n.includes("zapallito") || n.includes("ajo") || c.includes("verdura")) {
    const isTubercle = n.includes("papa") || n.includes("batata") || n.includes("choclo");
    return {
      grasas: 0.1,
      proteinas: isTubercle ? 2 : 1.1,
      carbohidratos: isTubercle ? 18 : 5,
      azucares: isTubercle ? 1.5 : 3.5,
      fibra: isTubercle ? 1.8 : 2.0,
      sodio: isTubercle ? 6 : 10,
    };
  }

  // 16. Beverages (Gaseosa, Jugo, Coca, Sprite)
  if (n.includes("gaseosa") || n.includes("jugo") || n.includes("coca") || n.includes("sprite") || n.includes("bebida") || n.includes("fernet") || n.includes("cerveza")) {
    const isAlcohol = n.includes("fernet") || n.includes("cerveza") || n.includes("vino");
    return {
      grasas: 0,
      proteinas: 0,
      carbohidratos: isAlcohol ? 4 : 10,
      azucares: isAlcohol ? 0.2 : 10,
      fibra: 0,
      sodio: 12,
    };
  }

  // Category based fallback if names didn't match
  if (c.includes("carne") || c.includes("carniceria") || c.includes("pollo") || c.includes("pescado")) {
    return {
      grasas: 10,
      proteinas: 20,
      carbohidratos: 0,
      azucares: 0,
      fibra: 0,
      sodio: 80,
    };
  }
  if (c.includes("lacteo") || c.includes("lácteo") || c.includes("queso")) {
    return {
      grasas: 15,
      proteinas: 12,
      carbohidratos: 3.5,
      azucares: 3.5,
      fibra: 0,
      sodio: 250,
    };
  }
  if (c.includes("almacen") || c.includes("almacén") || c.includes("fideos") || c.includes("arroz")) {
    return {
      grasas: 1.5,
      proteinas: 7,
      carbohidratos: 70,
      azucares: 2,
      fibra: 3,
      sodio: 50,
    };
  }
  if (c.includes("verdura") || c.includes("fruta")) {
    return {
      grasas: 0.1,
      proteinas: 1,
      carbohidratos: 8,
      azucares: 5,
      fibra: 2,
      sodio: 10,
    };
  }

  // Generic Default
  return {
    grasas: 1.0,
    proteinas: 2.0,
    carbohidratos: 12.0,
    azucares: 2.0,
    fibra: 1.5,
    sodio: 15,
  };
};

export const getIngredientNutriVal = (ingName: string | undefined, mercaderia: MercaderiaItem[]): ValoresNutricionales => {
  if (!ingName) return { grasas: 0, proteinas: 0, carbohidratos: 0, azucares: 0, fibra: 0, sodio: 0 };
  const item = mercaderia.find(m => m.ingredientes === ingName);
  if (!item) return generarNutricionEstimada(ingName);
  
  if (item.valoresNutricionales) {
    return item.valoresNutricionales;
  }
  return generarNutricionEstimada(item.ingredientes, item.categoria);
};

export const getIngredientWeight = (ingredientesName: string, cantidad: number, unit: string): number => {
  const u = (unit || "Gr.").toLowerCase().trim();
  if (u === "gr." || u === "gr" || u === "ml." || u === "ml" || u === "g" || u === "m") {
    return cantidad;
  } else if (u === "kg." || u === "kg" || u === "lts." || u === "lts" || u === "l" || u === "litro" || u === "litros" || u === "k") {
    return cantidad * 1000;
  } else {
    // Default estimate if "Uni." or other unit is specified
    let factor = 1.5; // default 150g per unit
    const lowerName = ingredientesName.toLowerCase();
    if (lowerName.includes("pollo entero")) factor = 15; // 1500g
    else if (lowerName.includes("pechuga de pollo")) factor = 2.5; // 250g
    else if (lowerName.includes("pata muslo")) factor = 3.5; // 350g
    else if (lowerName.includes("huevo")) factor = 0.5; // average egg is 50g
    else if (lowerName.includes("atado de acelga") || lowerName.includes("acelga")) factor = 5; // 500g
    else if (lowerName.includes("atado de veteraba") || lowerName.includes("veteraba")) factor = 5;
    else if (lowerName.includes("ajo")) factor = 0.05; // 5g
    else if (lowerName.includes("cebolla")) factor = 1.5; // 150g
    else if (lowerName.includes("pimiento") || lowerName.includes("morron")) factor = 1.5;
    else if (lowerName.includes("zapallito")) factor = 1.5;
    else if (lowerName.includes("papa")) factor = 2; // 200g
    else if (lowerName.includes("tomate")) factor = 1.5;
    else if (lowerName.includes("zanahoria")) factor = 1.2;
    else if (lowerName.includes("banana")) factor = 1.2;
    else if (lowerName.includes("durazno")) factor = 1.5;
    else if (lowerName.includes("manzana")) factor = 1.8;
    return cantidad * factor * 100;
  }
};

export const calcularNutricionAlimento = (
  alimento: AlimentoItem | undefined,
  mercaderia: MercaderiaItem[]
): ValoresNutricionales => {
  const result = { grasas: 0, proteinas: 0, carbohidratos: 0, azucares: 0, fibra: 0, sodio: 0 };
  if (!alimento) return result;

  let hasIngredients = false;
  const ingredients = [
    { name: alimento.ingrediente1, qty: alimento.cantidad1, unit: alimento.unidad1 },
    { name: alimento.ingrediente2, qty: alimento.cantidad2, unit: alimento.unidad2 },
    { name: alimento.ingrediente3, qty: alimento.cantidad3, unit: alimento.unidad3 },
  ];

  ingredients.forEach(ing => {
    if (ing.name && ing.qty !== undefined && ing.qty > 0) {
      hasIngredients = true;
      const item = mercaderia.find(m => m.ingredientes === ing.name);
      const unit = item ? item.unidadMedida : (ing.unit || "Gr.");
      const weight = getIngredientWeight(ing.name, ing.qty, unit);

      const baseNutri = getIngredientNutriVal(ing.name, mercaderia);
      const factor = weight / 100; // base nutritional info is per 100g

      result.grasas += baseNutri.grasas * factor;
      result.proteinas += baseNutri.proteinas * factor;
      result.carbohidratos += baseNutri.carbohidratos * factor;
      result.azucares += baseNutri.azucares * factor;
      result.fibra += baseNutri.fibra * factor;
      result.sodio += baseNutri.sodio * factor;
    }
  });

  if (hasIngredients) {
    return {
      grasas: Math.round(result.grasas * 10) / 10,
      proteinas: Math.round(result.proteinas * 10) / 10,
      carbohidratos: Math.round(result.carbohidratos * 10) / 10,
      azucares: Math.round(result.azucares * 10) / 10,
      fibra: Math.round(result.fibra * 10) / 10,
      sodio: Math.round(result.sodio),
    };
  }

  // Fallback: estimate from food name, but scaled up as a total standard meal portion (e.g., 350g)
  const est100g = generarNutricionEstimada(alimento.mercaderiaName);
  const mealFactor = 3.5; // standard meal weight is 350g, so total is 3.5 times the 100g baseline
  return {
    grasas: Math.round(est100g.grasas * mealFactor * 10) / 10,
    proteinas: Math.round(est100g.proteinas * mealFactor * 10) / 10,
    carbohidratos: Math.round(est100g.carbohidratos * mealFactor * 10) / 10,
    azucares: Math.round(est100g.azucares * mealFactor * 10) / 10,
    fibra: Math.round(est100g.fibra * mealFactor * 10) / 10,
    sodio: Math.round(est100g.sodio * mealFactor),
  };
};

export const getCalorieDensity = (name: string, category: string, sector: string): number => {
  const n = name.toLowerCase();
  const c = category.toLowerCase();
  const s = sector.toLowerCase();

  if (n.includes("aceite") || n.includes("manteca") || n.includes("grasa") || n.includes("mayonesa")) {
    return 800;
  }
  if (n.includes("vacio") || n.includes("costilla") || n.includes("asado") || n.includes("cerdo") || n.includes("chorizo") || n.includes("morcilla") || n.includes("salchicha")) {
    return 250;
  }
  if (n.includes("carne") || n.includes("molida") || n.includes("blanda") || c.includes("carne") || c.includes("carniceria")) {
    return 150;
  }
  if (n.includes("pollo") || n.includes("pechuga") || n.includes("pata") || n.includes("muslo")) {
    return 120;
  }
  if (n.includes("pescado") || n.includes("merluza") || n.includes("atun") || c.includes("pescado")) {
    return 110;
  }
  if (n.includes("queso") || n.includes("crema") || n.includes("muzzarella") || n.includes("mantecoso") || n.includes("cheddar") || c.includes("lacteo") || c.includes("lácteo")) {
    return 300;
  }
  if (n.includes("fideo") || n.includes("arroz") || n.includes("harina") || n.includes("pan") || n.includes("factura") || n.includes("galleta") || n.includes("galletita") || c.includes("granos") || c.includes("panaderia") || c.includes("panadería")) {
    return 350;
  }
  if (n.includes("dulce") || n.includes("azucar") || n.includes("miel") || n.includes("mermelada")) {
    return 300;
  }
  if (c.includes("fruta") || s.includes("fruta")) {
    return 50;
  }
  if (c.includes("verdura") || s.includes("verdura") || s.includes("frutas y verduras") || n.includes("atado")) {
    return 25;
  }

  return 120;
};

export const calculateIngredientCalories = (ingName: string | undefined, cantidad: number | undefined, mercaderia: MercaderiaItem[]): number => {
  if (!ingName || cantidad === undefined) return 0;
  const item = mercaderia.find(m => m.ingredientes === ingName);
  if (!item) return 0;
  
  const caloriasBase100g = item.calorias !== undefined && item.calorias !== null ? item.calorias : getCalorieDensity(item.ingredientes, item.categoria, item.sector);
  const unit = item.unidadMedida || "Gr.";
  const cantidadEnGramos = getIngredientWeight(item.ingredientes, cantidad, unit);
  
  return (cantidadEnGramos / 100) * caloriasBase100g;
};

export const calcularNutricionPlato = (
  plato: PlatoItem | undefined,
  alimentos: AlimentoItem[],
  mercaderia: MercaderiaItem[] = []
): ValoresNutricionales => {
  const result = { grasas: 0, proteinas: 0, carbohidratos: 0, azucares: 0, fibra: 0, sodio: 0 };
  if (!plato) return result;

  const linkedAlimentoIds = [plato.alimentoId1, plato.alimentoId2, plato.alimentoId3].filter(Boolean) as string[];

  linkedAlimentoIds.forEach(id => {
    const ali = alimentos.find(a => a.id === id);
    if (ali) {
      const vn = ali.valoresNutricionales || (mercaderia.length > 0 ? calcularNutricionAlimento(ali, mercaderia) : undefined);
      if (vn) {
        result.grasas += Number(vn.grasas || 0);
        result.proteinas += Number(vn.proteinas || 0);
        result.carbohidratos += Number(vn.carbohidratos || 0);
        result.azucares += Number(vn.azucares || 0);
        result.fibra += Number(vn.fibra || 0);
        result.sodio += Number(vn.sodio || 0);
      }
    }
  });

  return {
    grasas: Math.round((result.grasas || 0) * 10) / 10,
    proteinas: Math.round((result.proteinas || 0) * 10) / 10,
    carbohidratos: Math.round((result.carbohidratos || 0) * 10) / 10,
    azucares: Math.round((result.azucares || 0) * 10) / 10,
    fibra: Math.round((result.fibra || 0) * 10) / 10,
    sodio: Math.round(result.sodio || 0),
  };
};

