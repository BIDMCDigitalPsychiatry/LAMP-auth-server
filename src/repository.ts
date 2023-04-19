import { Db, MongoClient } from 'mongodb'; // eslint-disable-line import/no-unresolved

import { Decrypt, Encrypt } from './utils.js';

let DB: Db;
const COLLECTION_NAME = "credential";

type Credential = {access_key: string, secret_key?: null | string, _deleted?: boolean};

class Repository {
  static _verifySecret(credential: Credential, secret: null | string) {
    const hasSecret = !!credential.secret_key && credential.secret_key.length > 0;
    const providesSecret = !!secret && secret.length > 0;
    if (credential.secret_key && hasSecret && providesSecret) {
      const result = Decrypt(credential.secret_key, "AES256") === secret;
      return result;
    }
    return hasSecret === providesSecret;
  }

  static async find(username: string, secret: string | null) {
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

  static async updateSecret(username: string, secret: null | string, newSecret: string) {
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
    const collection = DB.collection<Credential>(COLLECTION_NAME);
    return collection;
  }

  // This is not part of the required or supported API, all initialization should happen before
  // you pass the adapter to `new Provider`
  static async connect() {
    if (!process.env.MONGODB_URI) {
      throw new Error("Can't connect to db env MONGODB_URI missing");
    }
    const connection = await MongoClient.connect(process.env.MONGODB_URI);

    const db = process.env.MONGODB_URI?.replace("/?", "?").split("/").reverse()[0]?.split("?")[0].substring(0, 30)
    DB = connection.db(db);
  }
}

export default Repository;
