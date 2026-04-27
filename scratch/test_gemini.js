const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config({ path: ".env.local" });

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("Testing with Key:", apiKey?.substring(0, 8) + "...");
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    const result = await model.generateContent("Hi");
    const response = await result.response;
    console.log("Success! Response:", response.text());
  } catch (err) {
    console.error("Test Failed!");
    console.error("Status:", err.status);
    console.error("Message:", err.message);
    if (err.response) {
      console.error("Response Details:", JSON.stringify(err.response, null, 2));
    }
  }
}

test();
