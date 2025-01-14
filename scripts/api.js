import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import * as Firestore from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

if (!localStorage.getItem("Page")) localStorage.setItem("Page", "Liked");
if (!localStorage.getItem("Volume")) localStorage.setItem("Volume", "50");

const FirebaseConfig = {
    apiKey: "AIzaSyD49BnshPbIo_p7d1j0lKXGxnoI6TkqufA",
    authDomain: "amply-6b157.firebaseapp.com",
    projectId: "amply-6b157",
    storageBucket: "amply-6b157.firebasestorage.app",
    messagingSenderId: "246743306471",
    appId: "1:246743306471:web:c4292282bda4c4eef3d242"
};

export const GithubStorageConfig = {
    Token: "",
    StorageOwner: "kayyraa",
    StorageName: "DirectStorage"
};

window.Volume = parseInt(localStorage.getItem("Volume")) / 100 || 0.5;
window.Playing = [false, null];

export const App = initializeApp(FirebaseConfig);
export const Db = Firestore.getFirestore(App);

export const Playback = document.querySelector(".Playback");

export const Audio = document.createElement("audio");
document.body.appendChild(Audio);

export const Input = document.createElement("input");
Input.type = "file";
Input.accept = ".mp3";
Input.style.display = "none";
document.body.appendChild(Input);

export const ContentContainer = document.querySelector("content");
export const Sidebar = document.querySelector("sidebar");

export const UploadButton = document.querySelector(".UploadButton");

export const Headers = {};
document.querySelectorAll("content > div[href]").forEach(Header => {
    Headers[Header.getAttribute("href")] = [Header.getAttribute("href"), Header];
});

export class Content {
    constructor(Href) {
        this.Href = Href;
    }

    Show() {
        Array.from(ContentContainer.children).forEach(Other => {
            if (Other.hasAttribute("href") && Other.getAttribute("href") !== this.Href) {
                Other.style.display = "none";
            }
        });
        ContentContainer.querySelector(`div[href="${this.Href}"]`).style.display = "initial";
    }
}

export class GithubStorage {
	constructor(Document) {
		this.File = Document || null;
	}

	async Upload(Path = "") {
		if (!this.File) throw new Error("No file provided for upload.");
		const FileContent = await this.ReadFileAsBase64(this.File);

		const Url = `https://api.github.com/repos/${GithubStorageConfig.StorageOwner}/${GithubStorageConfig.StorageName}/contents/${Path}`;
		const Data = {
			message: "Upload file to repo",
			content: FileContent
		};

		const Response = await fetch(Url, {
			method: "PUT",
			headers: {
				"Authorization": `Bearer ${GithubStorageConfig.Token}`,
				"Accept": "application/vnd.github.v3+json"
			},
			body: JSON.stringify(Data)
		});

		const Result = await Response.json();
		if (Response.ok) {
			console.log("File uploaded:", Result.content.html_url);
		} else {
			console.error("Upload failed:", Result);
		}
	}

	async Download(Path) {
		const Url = `https://api.github.com/repos/${GithubStorageConfig.StorageOwner}/${GithubStorageConfig.StorageName}/contents/${Path}`;

		const Response = await fetch(Url, {
			method: "GET",
			headers: {
				"Authorization": `Bearer ${GithubStorageConfig.Token}`,
				"Accept": "application/vnd.github.v3+json"
			}
		});

		if (Response.ok) {
			const Result = await Response.json();
			const FileContent = atob(Result.content); // Decode Base64 content
			const Blob = new Blob([FileContent], { type: "application/octet-stream" });
			return new File([Blob], Path.split("/").pop(), { type: Blob.type });
		} else {
			const ErrorData = await Response.json();
			console.error("Failed to fetch file:", ErrorData);
			throw new Error(ErrorData.message || "File fetch failed");
		}
	}

	async ReadFileAsBase64(File) {
		return new Promise((Resolve, Reject) => {
			const Reader = new FileReader();
			Reader.onload = () => Resolve(Reader.result.split(",")[1]);
			Reader.onerror = Reject;
			Reader.readAsDataURL(File);
		});
	}
}

export class Storage {
    constructor(Collection = "") {
        this.Collection = Collection;
    }

    async AppendDocument(DocumentData) {
        if (!this.Collection) return;
        const DocRef = await Firestore.addDoc(Firestore.collection(Db, this.Collection), DocumentData);
        return DocRef.id;
    }

    async GetDocument(DocumentId) {
        if (!this.Collection) return;
        const DocRef = Firestore.doc(Db, this.Collection, DocumentId);
        const Snapshot = await Firestore.getDoc(DocRef);

        if (Snapshot.exists()) return { id: Snapshot.id, ...Snapshot.data() };
        else return null;
    }

    async UpdateDocument(DocumentId, DocumentData) {
        if (!this.Collection) return;
        const DocRef = Firestore.doc(Db, this.Collection, DocumentId);
        await Firestore.updateDoc(DocRef, DocumentData);
    }

    async DeleteDocument(DocumentId) {
        if (!this.Collection) return;
        const DocRef = Firestore.doc(Db, this.Collection, DocumentId);
        await Firestore.deleteDoc(DocRef);
    }

    async GetDocuments(Query = {}) {
        if (!this.Collection) return;
        const CollectionRef = Firestore.collection(Db, this.Collection);
        let QueryRef = CollectionRef;
        Object.entries(Query).forEach(([Key, Value]) => {
            QueryRef = Firestore.query(QueryRef, Firestore.where(Key, "==", Value));
        });
        const QuerySnapshot = await Firestore.getDocs(QueryRef);
        return QuerySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async GetDocumentsByField(FieldName, FieldValue) {
        if (!this.Collection || FieldValue === undefined) return;
        const QueryRef = Firestore.query(
            Firestore.collection(Db, this.Collection),
            Firestore.where(FieldName, "==", FieldValue)
        );
        const QuerySnapshot = await Firestore.getDocs(QueryRef);
        return QuerySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }    

    async GetDocumentByFieldIncludes(FieldName, FieldValue) {
        if (!this.Collection) return;
        const QueryRef = Firestore.query(
            Firestore.collection(Db, this.Collection),
            Firestore.where(FieldName, ">=", FieldValue)
        );
        const QuerySnapshot = await Firestore.getDocs(QueryRef);
        return QuerySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }
}

new Storage("Secrets").GetDocument("Token").then((Document) => GithubStorageConfig.Token = Document.Value)