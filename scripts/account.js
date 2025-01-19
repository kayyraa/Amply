import * as Api from "./api.js";

const UsernameInput = document.querySelector(".UsernameInput");
const PasswordInput = document.querySelector(".PasswordInput");
const SubmitButton = document.querySelector(".SubmitButton");

const UsernameLabel = document.querySelector(".UsernameLabel");

const Storage = new Api.Storage("Users");

SubmitButton.addEventListener("click", async () => {
    const Username = UsernameInput.value;
    const Password = PasswordInput.value;
    if (!Username || !Password) return;

    const User = {
        Username: Username,
        Password: Password,
        Uuid: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (Char) => {
            const Random = (Math.random() * 16) | 0;
            const Value = Char === "x" ? Random : (Random & 0x3) | 0x8;
            return Value.toString(16);
        })
    };

    await Storage.GetDocumentsByField("Username", Username).then(async (Document) => {
        if (!Document || !Document[0]) {
            await Storage.AppendDocument(User);
            localStorage.setItem("User", JSON.stringify(User));
            location.reload();
        } else {
            if (Document[0].Password !== Password) return;
            localStorage.setItem("User", JSON.stringify(User));
            location.reload();
        }
    });
});

if (localStorage.getItem("User")) {
    await Storage.GetDocumentsByField("Username", JSON.parse(localStorage.getItem("User")).Username).then((Document) => {
        if (!Document || !Document[0]) return;
        if (Document[0].Password !== JSON.parse(localStorage.getItem("User")).Password) localStorage.removeItem("User");
        UsernameLabel.innerHTML = Document[0].Username;
    });
}
