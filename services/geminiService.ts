
// @google/genai cannot be used directly in the browser without a backend proxy
// to protect the API key. This is a mock service to simulate the experience.
// In a real application, this service would make a request to your own backend,
// which would then securely call the Gemini API.

// We are not importing from '@google/genai' here because this is a mock.
// import { GoogleGenAI, Chat } from "@google/genai";

interface MockChat {
  sendMessage: (request: { message: string }) => Promise<{ text: string }>;
}

export const createChat = (): MockChat => {
  // This mock function simulates a chat session with Gemini.
  return {
    sendMessage: async (request: { message: string }): Promise<{ text: string }> => {
      console.log("Mock Gemini Request:", request.message);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

      const lowerCaseMessage = request.message.toLowerCase();

      if (lowerCaseMessage.includes("work from home") || lowerCaseMessage.includes("wfh")) {
        return { text: "Our Work From Home (WFH) policy allows for flexible remote work. Employees are expected to maintain their standard working hours and be available for meetings. Please ensure you have a stable internet connection and a suitable workspace. For specific details on equipment stipends, please refer to the full 'Work From Home Policy' document." };
      } else if (lowerCaseMessage.includes("expense") || lowerCaseMessage.includes("reimbursement")) {
        return { text: "For expense reimbursement, please use the company portal to submit your claims. All expenses must be accompanied by a valid receipt. Reimbursements for travel, meals, and other approved costs are typically processed within 5-7 business days. You can find the detailed policy under 'Expense Reimbursement'." };
      } else if (lowerCaseMessage.includes("code of conduct")) {
        return { text: "The Code of Conduct outlines our commitment to a respectful and inclusive workplace. It covers professional behavior, anti-harassment policies, and our core company values. All employees are required to read and acknowledge this policy during their first week." };
      } else {
        return { text: "I'm here to help with questions about company policies. I couldn't find a specific answer for your query. Could you try rephrasing, or check the document list for the relevant policy?" };
      }
    },
  };
};
