import { MongoClient } from 'mongodb'; // eslint-disable-line import/no-unresolved

import { Decrypt, Encrypt } from './utils.js';

let DB;
const COLLECTION_NAME = "credential";

class Repository {
  static _verifySecret(credential, secret) {
    const hasSecret = !!credential.secret_key && credential.secret_key.length > 0;
    const providesSecret = !!secret && secret.length > 0;
    if (hasSecret && providesSecret) {
      const result = Decrypt(credential.secret_key, "AES256") === secret;
      return result;
    }
    return hasSecret === providesSecret;
  }

  static async find(username, secret) {
    if (!username) {
      throw new Error("Missing username");
    }
    const result = await Repository.coll().find({ _deleted: false, access_key: username }).limit(1).toArray();
    const verifiedAccounts = result.filter((credential) => this._verifySecret(credential, secret));
    if (verifiedAccounts.length === 0) {
      throw new Error("Invalid username/password pair");
    }
    const account = verifiedAccounts[0];
    return {accountId: account.access_key, federatedId: account._id};
  }

  static async updateSecret(username, secret, newSecret) {
    if (!newSecret) {
      throw new Error("Missing new secret");
    }
    const account = await this.find(username, secret);
    await Repository.coll().findOneAndUpdate(
      { _id: account.federatedId },
      {
        $set: {
          secret_key: Encrypt(newSecret, "AES256"),
        },
      }
    )

    return account;
  }

  static coll() {
    const collection = DB.collection(COLLECTION_NAME);
    return collection;
  }

  // This is not part of the required or supported API, all initialization should happen before
  // you pass the adapter to `new Provider`
  static async connect() {
    const connection = await MongoClient.connect(process.env.MONGODB_URI);

    const db = process.env.MONGODB_URI?.replace("/?", "?").split("/").reverse()[0]?.split("?")[0].substring(0, 30)
    DB = connection.db(db);
  }
}

export default Repository;
