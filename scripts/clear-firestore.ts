#!/usr/bin/env tsx

/**
 * Clear Firestore data for testing
 * Usage: tsx scripts/clear-firestore.ts <userId>
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = require('../apps/functions/service-account.json');

initializeApp({
    credential: cert(serviceAccount),
});

const db = getFirestore();

async function clearUserData(userId: string) {
    console.log(`Clearing data for user: ${userId}`);

    // Delete all people for this user
    const peopleSnapshot = await db
        .collection('people')
        .where('uid', '==', userId)
        .get();

    console.log(`Found ${peopleSnapshot.size} people documents`);

    const batch = db.batch();
    peopleSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    console.log('✅ Deleted people documents');

    // Delete conversations (if any)
    const conversationsSnapshot = await db
        .collection('conversations')
        .where('uid', '==', userId)
        .get();

    console.log(`Found ${conversationsSnapshot.size} conversation documents`);

    const batch2 = db.batch();
    conversationsSnapshot.docs.forEach((doc) => {
        batch2.delete(doc.ref);
    });

    await batch2.commit();
    console.log('✅ Deleted conversation documents');

    console.log('✅ All user data cleared!');
}

async function clearAllCollections() {
    console.log('Clearing ALL Firestore data...');

    const collections = ['people', 'conversations', 'users'];

    for (const collectionName of collections) {
        const snapshot = await db.collection(collectionName).get();
        console.log(`Found ${snapshot.size} documents in ${collectionName}`);

        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`✅ Cleared ${collectionName}`);
    }

    console.log('✅ All collections cleared!');
}

const userId = process.argv[2];

if (userId === 'all') {
    clearAllCollections().then(() => process.exit(0));
} else if (userId) {
    clearUserData(userId).then(() => process.exit(0));
} else {
    console.log('Usage: tsx scripts/clear-firestore.ts <userId|all>');
    console.log('Example: tsx scripts/clear-firestore.ts abc123');
    console.log('Example: tsx scripts/clear-firestore.ts all');
    process.exit(1);
}
