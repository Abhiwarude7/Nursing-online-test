// src/saveResult.js
import { addDoc, collection } from "firebase/firestore";
import { db } from "./firebase";

export const saveResult = async (userId, score) => {
  await addDoc(collection(db, "results"), {
    userId,
    score,
    date: new Date()
  });
};
