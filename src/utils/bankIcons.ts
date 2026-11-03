/**
 * Íconos reales de bancos/billeteras virtuales argentinas, extraídos de icons.com.ar (botón
 * "Copiar SVG" de cada ícono — el propio sitio ofrece ese botón para reusar sus SVG, aunque su
 * único texto legal es "los logos y marcas comerciales son propiedad de sus respectivos dueños":
 * un aviso de titularidad de marca, no una licencia formal de uso. Se usan igual porque el sitio
 * habilita explícitamente copiarlos para este fin.
 *
 * Los archivos viven en src/assets/bank-icons/*.svg; este módulo solo arma el mapa
 * "nombre normalizado -> URL del asset" para que BankBadge los pueda mostrar.
 */
// Imports explícitos (en vez de import.meta.glob) para no depender de los tipos de "vite/client",
// que este proyecto no incluye en tsconfig.json — agregar esa dependencia solo para esto hubiera
// sido un cambio de alcance mayor al necesario.
import astropay from "../assets/bank-icons/astropay.svg";
import bancoBica from "../assets/bank-icons/banco-bica.svg";
import bancoCiudad from "../assets/bank-icons/banco-ciudad.svg";
import bancoCoinag from "../assets/bank-icons/banco-coinag.svg";
import bancoColumbia from "../assets/bank-icons/banco-columbia.svg";
import bancoComafi from "../assets/bank-icons/banco-comafi.svg";
import bancoCorrientes from "../assets/bank-icons/banco-corrientes.svg";
import bancoCredicoop from "../assets/bank-icons/banco-credicoop.svg";
import bancoDelSol from "../assets/bank-icons/banco-del-sol.svg";
import bancoEntreRios from "../assets/bank-icons/banco-entre-rios.svg";
import bancoGalicia from "../assets/bank-icons/banco-galicia.svg";
import bancoHipotecario from "../assets/bank-icons/banco-hipotecario.svg";
import bancoItau from "../assets/bank-icons/banco-itau.svg";
import bancoMacro from "../assets/bank-icons/banco-macro.svg";
import bancoMunicipal from "../assets/bank-icons/banco-municipal.svg";
import bancoNacion from "../assets/bank-icons/banco-nacion.svg";
import bancoPatagonia from "../assets/bank-icons/banco-patagonia.svg";
import bancoPiano from "../assets/bank-icons/banco-piano.svg";
import bancoProvincia from "../assets/bank-icons/banco-provincia.svg";
import bancoSanJuan from "../assets/bank-icons/banco-san-juan.svg";
import bancoSantaCruz from "../assets/bank-icons/banco-santa-cruz.svg";
import bancoSantaFe from "../assets/bank-icons/banco-santa-fe.svg";
import bancoSantander from "../assets/bank-icons/banco-santander.svg";
import bancoSupervielle from "../assets/bank-icons/banco-supervielle.svg";
import bancor from "../assets/bank-icons/bancor.svg";
import bbva from "../assets/bank-icons/bbva.svg";
import belo from "../assets/bank-icons/belo.svg";
import berry from "../assets/bank-icons/berry.svg";
import bpn from "../assets/bank-icons/bpn.svg";
import brubank from "../assets/bank-icons/brubank.svg";
import buenbit from "../assets/bank-icons/buenbit.svg";
import cabal from "../assets/bank-icons/cabal.svg";
import cencopay from "../assets/bank-icons/cencopay.svg";
import claroPay from "../assets/bank-icons/claro-pay.svg";
import cocos from "../assets/bank-icons/cocos.svg";
import cocosCrypto from "../assets/bank-icons/cocos-crypto.svg";
import cuentaDni from "../assets/bank-icons/cuenta-dni.svg";
import dolarApp from "../assets/bank-icons/dolar-app.svg";
import fiwind from "../assets/bank-icons/fiwind.svg";
import hsbc from "../assets/bank-icons/hsbc.svg";
import icbc from "../assets/bank-icons/icbc.svg";
import lemon from "../assets/bank-icons/lemon.svg";
import letsbit from "../assets/bank-icons/letsbit.svg";
import mercadoPago from "../assets/bank-icons/mercado-pago.svg";
import modo from "../assets/bank-icons/modo.svg";
import naranjaX from "../assets/bank-icons/naranja-x.svg";
import openbank from "../assets/bank-icons/openbank.svg";
import personalPay from "../assets/bank-icons/personal-pay.svg";
import plus from "../assets/bank-icons/plus.svg";
import prex from "../assets/bank-icons/prex.svg";
import ripio from "../assets/bank-icons/ripio.svg";
import satoshiTango from "../assets/bank-icons/satoshi-tango.svg";
import takenos from "../assets/bank-icons/takenos.svg";
import uala from "../assets/bank-icons/uala.svg";
import wallbit from "../assets/bank-icons/wallbit.svg";
import yoy from "../assets/bank-icons/yoy.svg";

const ICON_URLS: Record<string, string> = {
  astropay,
  "banco-bica": bancoBica,
  "banco-ciudad": bancoCiudad,
  "banco-coinag": bancoCoinag,
  "banco-columbia": bancoColumbia,
  "banco-comafi": bancoComafi,
  "banco-corrientes": bancoCorrientes,
  "banco-credicoop": bancoCredicoop,
  "banco-del-sol": bancoDelSol,
  "banco-entre-rios": bancoEntreRios,
  "banco-galicia": bancoGalicia,
  "banco-hipotecario": bancoHipotecario,
  "banco-itau": bancoItau,
  "banco-macro": bancoMacro,
  "banco-municipal": bancoMunicipal,
  "banco-nacion": bancoNacion,
  "banco-patagonia": bancoPatagonia,
  "banco-piano": bancoPiano,
  "banco-provincia": bancoProvincia,
  "banco-san-juan": bancoSanJuan,
  "banco-santa-cruz": bancoSantaCruz,
  "banco-santa-fe": bancoSantaFe,
  "banco-santander": bancoSantander,
  "banco-supervielle": bancoSupervielle,
  bancor,
  bbva,
  belo,
  berry,
  bpn,
  brubank,
  buenbit,
  cabal,
  cencopay,
  "claro-pay": claroPay,
  cocos,
  "cocos-crypto": cocosCrypto,
  "cuenta-dni": cuentaDni,
  "dolar-app": dolarApp,
  fiwind,
  hsbc,
  icbc,
  lemon,
  letsbit,
  "mercado-pago": mercadoPago,
  modo,
  "naranja-x": naranjaX,
  openbank,
  "personal-pay": personalPay,
  plus,
  prex,
  ripio,
  "satoshi-tango": satoshiTango,
  takenos,
  uala,
  wallbit,
  yoy,
};

// Nombre (como aparece en BANCOS_COMUNES o como lo tipee el usuario, en minúscula) -> slug del
// archivo. Varias claves pueden apuntar al mismo ícono (alias / variantes de escritura).
const NAME_TO_SLUG: Record<string, string> = {
  "banco nación": "banco-nacion",
  "banco nacion": "banco-nacion",
  "banco provincia": "banco-provincia",
  "banco galicia": "banco-galicia",
  galicia: "banco-galicia",
  "banco santander": "banco-santander",
  bbva: "bbva",
  "banco macro": "banco-macro",
  "banco supervielle": "banco-supervielle",
  "banco credicoop": "banco-credicoop",
  "banco ciudad": "banco-ciudad",
  "banco patagonia": "banco-patagonia",
  "banco comafi": "banco-comafi",
  "banco hipotecario": "banco-hipotecario",
  "banco san juan": "banco-san-juan",
  icbc: "icbc",
  hsbc: "hsbc",
  "banco columbia": "banco-columbia",
  "banco entre ríos": "banco-entre-rios",
  "banco entre rios": "banco-entre-rios",
  brubank: "brubank",
  "mercado pago": "mercado-pago",
  mercadopago: "mercado-pago",
  ualá: "uala",
  uala: "uala",
  "naranja x": "naranja-x",
  "banco del sol": "banco-del-sol",
  lemon: "lemon",
  "personal pay": "personal-pay",
  modo: "modo",
  "cuenta dni": "cuenta-dni",
  belo: "belo",
  prex: "prex",
  "banco santa cruz": "banco-santa-cruz",
  "banco santa fe": "banco-santa-fe",
  "banco bica": "banco-bica",
  "banco piano": "banco-piano",
  "banco municipal": "banco-municipal",
  "banco coinag": "banco-coinag",
  "banco corrientes": "banco-corrientes",
  itaú: "banco-itau",
  itau: "banco-itau",
  "banco itaú": "banco-itau",
  "banco itau": "banco-itau",
  bancor: "bancor",
  openbank: "openbank",
  cabal: "cabal",
  cocos: "cocos",
  "cocos crypto": "cocos-crypto",
  wallbit: "wallbit",
  berry: "berry",
  astropay: "astropay",
  dolarapp: "dolar-app",
  "dolar app": "dolar-app",
  "satoshi tango": "satoshi-tango",
  fiwind: "fiwind",
  yoy: "yoy",
  cencopay: "cencopay",
  ripio: "ripio",
  takenos: "takenos",
  bpn: "bpn",
  buenbit: "buenbit",
  "let'sbit": "letsbit",
  letsbit: "letsbit",
  "claro pay": "claro-pay",
  plus: "plus",
};

export function getBankIconUrl(name: string): string | null {
  const slug = NAME_TO_SLUG[name.trim().toLowerCase()];
  return (slug && ICON_URLS[slug]) || null;
}

/** Nombres "lindos" de todos los bancos/billeteras con ícono real disponible, para ofrecerlos
 * como sugerencias completas en BankNameInput (orden alfabético). */
export const BANCOS_CON_ICONO = [
  "AstroPay",
  "Banco Bica",
  "Banco Ciudad",
  "Banco Coinag",
  "Banco Columbia",
  "Banco Comafi",
  "Banco Corrientes",
  "Banco Credicoop",
  "Banco del Sol",
  "Banco Entre Ríos",
  "Banco Galicia",
  "Banco Hipotecario",
  "Banco Macro",
  "Banco Municipal",
  "Banco Nación",
  "Banco Patagonia",
  "Banco Piano",
  "Banco Provincia",
  "Banco San Juan",
  "Banco Santa Cruz",
  "Banco Santa Fe",
  "Banco Santander",
  "Banco Supervielle",
  "Bancor",
  "BBVA",
  "Belo",
  "Berry",
  "BPN",
  "Brubank",
  "Buenbit",
  "Cabal",
  "CencoPay",
  "Claro Pay",
  "Cocos",
  "Cocos Crypto",
  "Cuenta DNI",
  "DolarApp",
  "Fiwind",
  "HSBC",
  "ICBC",
  "Itaú",
  "Lemon",
  "Let'sBit",
  "Mercado Pago",
  "MODO",
  "Naranja X",
  "Openbank",
  "Personal Pay",
  "Plus",
  "Prex",
  "Ripio",
  "Satoshi Tango",
  "Takenos",
  "Ualá",
  "Wallbit",
  "YOY",
];
