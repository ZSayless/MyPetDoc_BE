const BaseModel = require("./BaseModel");

class ContactMessage extends BaseModel {
  static tableName = "contact_messages";
}

module.exports = ContactMessage;
