import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
    console.log('Testing Gemini Models...');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

    const modelsToTry = [
        "gemini-2.0-flash",
        "gemini-1.5-flash"
    ];

    for (const modelName of modelsToTry) {
        console.log(`\nTesting ${modelName}...`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hello");
            console.log(`✅ ${modelName}: SUCCESS`);
            const response = await result.response;
            console.log(`Response: ${response.text()}`);
            return; // Exit on first success to save time
        } catch (error: any) {
            console.log(`❌ ${modelName}: FAILED - ${error.message.split('\n')[0]}`);
        }
    }
};

run();
