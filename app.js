require("dotenv").config();

const {
  createBot,
  createProvider,
  createFlow,
  addKeyword,
  EVENTS,
} = require("@bot-whatsapp/bot");
const QRPortalWeb = require("@bot-whatsapp/portal");
const { init } = require("bot-ws-plugin-openai");
const BaileysProvider = require("@bot-whatsapp/provider/baileys");
const MockAdapter = require("@bot-whatsapp/database/mock");
const { handlerAI } = require("./utils");
const { textToVoice } = require("./services/eventlab");
const axios = require("axios");
const chatgpt = require("./services/chatgpt.js");
const { base64ToPng } = require("./plugin/util.js");
// const host = 'https://146c-181-188-162-159.ngrok-free.app';
// const host = 'https://7e3e-181-188-162-159.ngrok-free.app';
// const host = 'http://192.168.88.88:8080';
// const host = 'https://92d1-190-186-42-122.ngrok-free.app'
const host = "http://localhost:8080";

const employeesAddonConfig = {
  model: "gpt-3.5-turbo",
  temperature: 0,
  apiKey: process.env.OPENAI_API_KEY,
};

const employeesAddon = init(employeesAddonConfig);

const flowStaff = addKeyword(EVENTS.ACTION).addAnswer(
  // ["Claro que te interesa?", "mejor te envio audio.."],
  `mejor te envio un audio..`,
  null,
  async (_, { flowDynamic, state }) => {
    console.log("🙉 texto a voz....");
    const currentState = state.getMyState();
    const path = await textToVoice(currentState.answer);
    console.log(`🙉 Fin texto a voz....[PATH]:${path}`);
    await flowDynamic([{ body: "escucha", media: path }]);
  }
);

const flowRecommend = addKeyword(['hola', 'alo'])
  .addAnswer(
    "Por favor, indicame para que tipo de persona estas buscando ropa el dia de hoy",
    { capture: true },
    async (ctx, { state }) => {
      state.update({ gender: ctx.body });
    }
  )
  .addAnswer(
    `Para que ocasion estas buscando tu atuendo`,
    { capture: true },
    async (ctx, { gotoFlow, state }) => {
      const ocation = ctx.body;
      const currentState = state.getMyState();
      console.log({ currentState });
      const check = await chatgpt.completion(`
      Esta es la lista de articulos que actualmente tenemos en nuestra tienda. Cada linea indicara Id_producto, nombre_articulo, marca, categoria, precio. Cada dato estara separado por comas:

      M1,	Gala Carmesí,	Versace,	Vestidos, 30
      M2,	Día Floral,	Dolce & Gabbana, Vestidos, 45
      M3,	Envoltura Verde,	Diane von Furstenberg, Vestidos, 40
      M4,	Sheath Clásico,	Givenchy, Vestidos, 50
      M5,	Marina Dorada,	Saint Laurent, Blazers, 35
      M6,	Relajado Beige,	Stella McCartney, Blazers, 40
      M7,	Contraste Empresarial, Hugo Boss, Blazers, 50
      M8,	Patrón Terroso,	Burberry, Blazers, 40
      M9,	Elegancia Profesional, Prada, Faldas, 40
      M10, Rojo Atrevido,	Versace, Faldas, 35
      M11, Estampa Bohemia,	Dolce & Gabbana, Faldas, 50
      M12, Elegancia Urbana,	Chanel,	Pantalones, 50
      M13, Verano Lino, Zara,	Pantalones, 60  

      H1,Essential White,Calvin Klein,Poleras, 50
      H2,Noir Abstract,Armani,Poleras, 40
      H3,Maritime Stripe,Ralph Lauren,Poleras, 45
      H4,Retro Revival,Tommy Hilfiger,Poleras, 30
      H5,Tailored Elegance,Calvin Klein,Pantalones, 60
      H6,Urban Denim,Levi's,Pantalones, 55
      H7,Casual Cotton,Tommy Hilfiger,Pantalones, 50
      H8,Adventure Ready,The North Face,Pantalones, 40
      H9,Elegance Oxford,Prada,Zapatos, 40
      H10,Urban Walk,Adidas,Zapatos, 60
      H11,Classic Tassel,Salvatore Ferragamo,Zapatos, 50
      H12,Trailmaster,Timberland,Zapatos, 35
        
      El cliente quiere un atuendo para el tipo de persona: ${currentState.gender}, y para la ocasion: ${ocation}.
          Basado en el detalle de articulos y lo que quiere el cliente determinar 
      
      EXISTE o NO_EXISTE una prenda que podamos recomendar (esta respuesta siempre en mayusculas)
      Cual es el Id_producto, nombre_articulo, precio que mejor se le da para la ocasion (si existe)
      
      formato de respuesta: [primera respuesta, id_producto, nombre_articulo, precio]
      `);

      console.log("check response ", { check });

      const getCheck = check.data.choices[0].text
        .trim()
        .replace("\n", "")
        .replace(".", "")
        .replace(" ", "");

      if (getCheck.includes("NO_EXISTE")) {
        console.log("NO EXISTE!");
      } else {
        console.log("EXISTE!");
        const [exists, idProd, article, price, imageB64] = getCheck.split(",");
        state.update({ idProd, article, price, imageB64 });
        // return gotoFlow(flowShow);
      }
    }
  )
  .addAction(async (ctx, { flowDynamic, state }) => {
    await flowDynamic("Obteniendo la imagen de nuestra recomendacion");
    const { idProd, price } = state.getMyState();
    // await flowDynamic([{ body: `Aqui la info del producto que te recomendamos! El costo es de${price} Bs.`, media: "https://www.abc.com.py/resizer/kLeXPlHT8yF93G2Z6hNfIwsGd1M=/fit-in/770x495/smart/filters:format(webp)/cloudfront-us-east-1.images.arcpublishing.com/abccolor/SRYJZDIZVRCG5KUERCZD3A5MDU.jfif" }]);
    await flowDynamic([
      {
        body: `Aqui la info del producto que te recomendamos! El costo es de${price} Bs.`,
        media: `${host}/img/item/${idProd}.png`,
      },
    ]);
    await flowDynamic(`Deseas comprar el articulo?`);
    // mostrar imagen
  });


const tokenUrl = `${host}/payment/bnb/token`;

const flowShow = addKeyword("comprar")
  .addAnswer(
    `Que cantidad deseas?`,
    { capture: true },
    async (ctx, { gotoFlow, state, flowDynamic }) => {
      const quantity = ctx.body;
      state.update({ quantity });

      let cookies;

      try {
        const response = await axios.post(tokenUrl);

        cookies = response.headers["set-cookie"];
        console.log("Respuesta creacion token", { response });
      } catch (error) {
        console.error("Error:", error);
      }

      let currentState = state.getMyState();
      let qrId;
      let qr;
      console.log({ currentState });

      const getQrUrl = `${host}/payment/bnb/qr`;
      const data = {
        gloss: `Compra de ${currentState.article}`,
        amount: parseInt(currentState.price) * parseInt(currentState.quantity),
        additionalData: "SalesMaestro",
      };

      console.log("Data sending to create QR: ", data);
      await flowDynamic(`Creando el QR de pago ⌛`);

      try {
        const response = await axios.post(getQrUrl, data, {
          headers: {
            Cookie: cookies.join(";"), // Set the cookies in the request header
          },
        });
        console.log("Respuesta creacion QR");
        // console.log(response.data);

        state.update({ qrId: response.data.data.qrId });
        console.log(response.data.data);
        qrId = response.data.data.qrId;
        qr = response.data.data.qr;
        console.log({ qrId });
      } catch (error) {
        console.log(error);
      }

      currentState = state.getMyState();

      console.log({ qrId });
      console.log({ qr });
      // await base64ToPng(qr, `${qrId}.png`);
      // await flowDynamic([{ body: `Puedes pagar mediante este QR`, media: `${qrId}.png`}]);
      await flowDynamic([
        {
          body: `Puedes pagar mediante este QR`,
          media: `${host}/img/qr/${qrId}.png`,
        },
      ]);
    }
  )
  .addAnswer(`Notifica con un "hecho" cuando hayas realizado el pago`);

const flowVerify = addKeyword("pagado")
  .addAnswer(`Verificando pago ⌛`)
  .addAction(async (ctx, { state, flowDynamic }) => {
    const currentState = state.getMyState();
    const qrId = currentState.qrId;
    const data = {
      idProduct: currentState.idProd,
      phone: ctx.from,
      quantity: currentState.quantity,
      amount: `${
        parseInt(currentState.quantity) * parseInt(currentState.price)
      }`,
    };
    console.log("Enviando a verificar ", data);

    try {
      const response = await axios.post(tokenUrl);

      cookies = response.headers["set-cookie"];
      console.log("Respuesta creacion token", { response });
    } catch (error) {
      console.error("Error:", error);
    }

    axios
      .post(`${host}/payment/bnb/${qrId}`, data, {
        headers: {
          Cookie: cookies.join(";"), // Set the cookies in the request header
        },
      })
      .then(async (response) => {
        console.log("Respuesta verificacion pago", { response });
        await flowDynamic(
          "Pago verificado! Nos contactaremos contigo para coordinar la entrega."
        );
        // return gotoFlow(flowAddress);
      })
      .catch(async (error) => {
        // return gotoFlow(flowEmpty);
        await flowDynamic("Error al verificar, intenta otra vez.");
      });
  });

const flowAddress = addKeyword("entrega")
  .addAnswer(
    `Tu compra ha sido exitosa! Por favor indicanos tu direccion`,
    { capture: true },
    async (ctx, { state }) => {
      console.log("Enviando mensaje a Despachador!");
    }
  )
  .addAnswer(`Gracias! Tu compra esta en camino que tengas un excelente dia`);

const flowVoiceNote = addKeyword(EVENTS.VOICE_NOTE).addAction(
  async (ctx, ctxFn) => {
    await ctxFn.flowDynamic("dame un momento para escucharte...🙉");
    console.log("🤖 voz a texto....");
    const text = await handlerAI(ctx);
    console.log(`🤖 Fin voz a texto....[TEXT]: ${text}`);
    const currentState = ctxFn.state.getMyState();
    const fullSentence = `${currentState?.answer ?? ""}. ${text}`;
    const { employee, answer } = await employeesAddon.determine(fullSentence);
    ctxFn.state.update({ answer });
    employeesAddon.gotoFlow(employee, ctxFn);
  }
);

// const greetingsFlow = addKeyword(['hola', 'hi'], { sensitive: false }).addAction(async (_, { flowDynamic, state, extensions }) => {
//     const msg = `Buenas estoy aqui para vender! como puedo ayudarte`
//     await flowDynamic(msg);
// });

const main = async () => {
  const adapterDB = new MockAdapter();

  const adapterFlow = createFlow([
    flowVoiceNote,
    flowRecommend,
    flowAddress,
    flowVerify,
    flowShow,
  ]);

  const adapterProvider = createProvider(BaileysProvider);

  /**
   * 🤔 Empledos digitales
   * Imaginar cada empleado descrito con sus deberes de manera explicita
   */
  const employees = [
    {
      name: "EMPLEADO_STAFF",
      description:
        "Soy Raul el staff amable encargado de dar la bienvenida cuando me saludan",
      flow: flowStaff,
    },
    {
      name: "EMPLEADO_SELLER",
      description: "Soy Pepe el staff amable encargado de recomendar ropa",
      flow: flowRecommend,
    }
  ];

  employeesAddon.employees(employees);

  createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });

  QRPortalWeb();
};

main();
