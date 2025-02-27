/**
 * Mongoose model for managing code blocks in the CodingSync application.
 * Defines the structure and storage for code blocks, including name, initial code, and solution,
 * stored in the 'CodeBlocks' collection within the 'CodeBlocks' database in MongoDB.
 * @module models/CodeBlock
 * @requires mongoose
 */

const mongoose = require("mongoose");

/**
 * Mongoose schema defining the structure of a CodeBlock document.
 * @typedef {Object} CodeBlockSchema
 * @property {string} name - The name of the code block, required.
 * @property {string} initialCode - The initial code for the block, required.
 * @property {string} solution - The correct solution for the block, required.
 */
const codeBlockSchema = new mongoose.Schema({
  name: { type: String, required: true },
  initialCode: { type: String, required: true },
  solution: { type: String, required: true },
});

/**
 * Mongoose model for CodeBlock, representing code blocks in the 'CodeBlocks' collection
 * within the 'CodeBlocks' database.
 * @type {mongoose.Model}
 */
module.exports = mongoose.model("CodeBlock", codeBlockSchema, "CodeBlocks");
