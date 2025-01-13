import * as Api from "./api.js"

new Api.Content(Api.Headers.Liked[0]).Show();

Api.ContentContainer.querySelectorAll("*[function]").forEach(Functional => {
    const Function = Functional.getAttribute("function");
    const Args = Function.split(":");
    Functional.addEventListener(Args[Args.length - 1], () => {
        if (Function.startsWith("Dir")) new Api.Content(Args[1]).Show();
    });
});

Api.Sidebar.querySelectorAll("*[function]").forEach(Functional => {
    const Function = Functional.getAttribute("function");
    const Args = Function.split(":");
    Functional.addEventListener(Args[Args.length - 1], () => {
        if (Function.startsWith("Dir")) new Api.Content(Args[1]).Show();
    });
});

Api.UploadButton.addEventListener("click", () => {
    Api.Input.click();
    Api.Input.addEventListener("change", async () => {
        const File = Api.Input.files[0];
        if (!File) return;

        const Reader = new FileReader();
        Reader.onload = async () => {
            const Base64Content = Reader.result.split(",")[1];
            const Extension = File.name.split(".")[1];

            const BlobContent = new Blob([new Uint8Array(atob(Base64Content).split("").map(char => char.charCodeAt(0)))], { type: File.type });
            const FileFromBlob = new Blob([BlobContent], { type: File.type });

            const Storage = new Api.GithubStorage(FileFromBlob);

            const Uuid = `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (Char) => {
                const Random = (Math.random() * 16) | 0;
                const Value = Char === "x" ? Random : (Random & 0x3) | 0x8;
                return Value.toString(16);
            });

            const EncodedFileName = `${Uuid}.${Extension}`;
            await Storage.Upload(`amply/${EncodedFileName}`);

            const AudioUrl = `https://github.com/${Api.GithubStorageConfig.StorageOwner}/${Api.GithubStorageConfig.StorageName}/raw/refs/heads/main/amply/${EncodedFileName}`;
            await new Api.Storage("Library").GetDocumentsByField("Uuid", Uuid).then(async (Documents) => {
                if (Documents.length > 0) return;
                await new Api.Storage("Library").AppendDocument({
                    Name: File.name.split(".")[0],
                    Author: JSON.parse(localStorage.getItem("User")).Username,
                    Uuid: Uuid,
                    Url: AudioUrl
                });
            });
        };

        Reader.readAsDataURL(File);
    });
});

const Queue = [];
const Discover = document.querySelector('[href="Discover"]');
await new Api.Storage("Library").GetDocuments().then(async (Documents) => {
    Documents.forEach(async (Document, Index) => {
        const RawUrl = Document.Url.replace("github.com", "raw.githubusercontent.com").replace("/raw/refs/heads/", "/");
        const Response = await fetch(RawUrl);
        if (!Response.ok) return;

        const AudioBlob = await Response.blob();
        const AudioFile = new File([AudioBlob], RawUrl.split("/").pop(), { type: "audio/mpeg" });
        const AudioElement = new Audio(URL.createObjectURL(AudioFile));
        AudioElement.volume = window.Volume;

        AudioElement.onloadedmetadata = () => {
            const Song = document.createElement("div");
            Song.innerHTML = `
                <span>${Index}</span>
                <img style="border-radius: 8px; box-sizing: border-box; border: 2px solid rgba(255, 255, 255, 0.5);" src="${Document.Cover || "../images/Note.svg"}">
                <span>${Document.Name}</span>
                <span>${Document.Author}</span>
                <span>${AudioElement.duration.toFixed(2)}</span>
            `;
            Song.style.order = Index;
            Song.style.cursor = "pointer";
            Discover.querySelector(".Items").appendChild(Song);

            Song.addEventListener("click", () => {
                Queue.length = 0;
                Queue.push(...Documents);
                const CurrentIndex = Queue.indexOf(Document);
                window.Playing = [true, Document, CurrentIndex];
                PlaySong(CurrentIndex);
            });
        };
    });
});

function PlaySong(Index) {
    Api.Playback.querySelector(".Play").src = "../images/Pause.svg"
    Array.from(Discover.querySelector(".Table").querySelector(".Items").children).forEach(Song => {
        if (parseInt(Song.style.order) === Index) Song.style.backgroundColor = "rgb(50, 50, 50)";
        else Song.style.backgroundColor = "";
    });

    const CurrentDocument = Queue[Index];
    const RawUrl = CurrentDocument.Url.replace("github.com", "raw.githubusercontent.com").replace("/raw/refs/heads/", "/");
    const AudioElement = new Audio(RawUrl);

    AudioElement.volume = window.Volume;
    window.AudioElement?.pause();
    window.AudioElement = AudioElement;

    Api.Playback.querySelector(".Data > img").src = CurrentDocument.Cover || "../images/Note.svg";
    Api.Playback.querySelector(".Data > div > span:first-child").innerHTML = CurrentDocument.Name;
    Api.Playback.querySelector(".Data > div > span:last-child").innerHTML = CurrentDocument.Author;

    AudioElement.addEventListener("timeupdate", () => {
        Api.Playback.querySelector(".Bar > .Fill").style.width = `${(AudioElement.currentTime / AudioElement.duration) * 100}%`;
    });

    let Hold = false;
    Api.Playback.querySelector(".Bar").addEventListener("mousedown", (Event) => {
        Hold = true;
        const Bar = Api.Playback.querySelector(".Bar");
        const Time = (Event.offsetX / Bar.offsetWidth) * AudioElement.duration;
        AudioElement.currentTime = Time;
    });
    document.addEventListener("mousemove", (Event) => {
        if (!Hold) return;
        const Bar = Api.Playback.querySelector(".Bar");
        const Time = (Event.offsetX / Bar.offsetWidth) * AudioElement.duration;
        AudioElement.currentTime = Time;
    });
    document.addEventListener("mouseup", () => {
        Hold = false;
    });

    AudioElement.onended = () => {
        if (Index < Queue.length - 1) PlaySong(Index + 1);
    };

    Api.Playback.querySelector(".Play").onclick = () => {
        if (window.Playing[0]) {
            window.Playing[0] = false;
            AudioElement.pause();
            Api.Playback.querySelector(".Play").src = "../images/Next.svg";
        } else {
            window.Playing[0] = true;
            AudioElement.play();
            Api.Playback.querySelector(".Play").src = "../images/Pause.svg";
        }
    };

    Api.Playback.querySelector(".Next").onclick = () => {
        if (Index < Queue.length - 1) PlaySong(Index + 1);
    };

    Api.Playback.querySelector(".Previous").onclick = () => {
        if (Index > 0) PlaySong(Index - 1);
    };

    AudioElement.play();
}