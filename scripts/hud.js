import * as Api from "./api.js"

new Api.Content(Api.Headers.Liked[0]).Show();

Api.ContentContainer.querySelectorAll("*[function]").forEach(Functional => {
    const Function = Functional.getAttribute("function");
    const Args = Function.split(":");
    Functional.addEventListener(Args[Args.length - 1], () => {
        if (Function.startsWith("Dir")) new Api.Content(Args[1]).Show();
        localStorage.setItem("Page", Args[1]);
    });
});

Api.Sidebar.querySelectorAll("*[function]").forEach(Functional => {
    const Function = Functional.getAttribute("function");
    const Args = Function.split(":");
    Functional.addEventListener(Args[Args.length - 1], () => {
        if (Function.startsWith("Dir")) new Api.Content(Args[1]).Show();
        localStorage.setItem("Page", Args[1]);
    });
});

const CoverInput = document.querySelector(".CoverInput");
const CoverFileInput = CoverInput.querySelector("input");
Api.UploadButton.addEventListener("click", () => {
    CoverInput.style.display = "initial";
    CoverFileInput.addEventListener("change", async () => {
        const CoverFile = CoverFileInput.files[0];
        if (!CoverFile) return;

        let Cover = "";
        const CoverFileReader = new FileReader();
        CoverFileReader.onload = (Event) => {
            Cover = CoverFileReader.result;
            document.querySelector(".CoverImage").src = Cover;
        };

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
                        Url: AudioUrl,
                        Cover: Cover
                    });
                });
                location.reload();
            };
    
            Reader.readAsDataURL(File);
        });
    });
});

const Queue = [];
const Discover = document.querySelector('[href="Discover"]');
let CurrentAudioElement = null;
await new Api.Storage("Library").GetDocuments().then(async (Documents) => {
    Documents.forEach(async (Document, Index) => {
        const RawUrl = Document.Url.replace("github.com", "raw.githubusercontent.com").replace("/raw/refs/heads/", "/");
        const Response = await fetch(RawUrl);
        if (!Response.ok) return;

        const AudioBlob = await Response.blob();
        const AudioFile = new File([AudioBlob], RawUrl.split("/").pop(), { type: "audio/mpeg" });
        const AudioElement = new Audio(URL.createObjectURL(AudioFile));
        AudioElement.volume = parseInt(localStorage.getItem("Volume")) / 100;

        AudioElement.onloadedmetadata = () => {
            const Song = document.createElement("div");
            Song.innerHTML = `
                <span>${Index + 1}</span>
                <img style="border-radius: 8px; box-sizing: border-box; border: 2px solid rgba(255, 255, 255, 0.5);" src="${Document.Cover || "../images/Note.svg"}">
                <span>${Document.Name}</span>
                <span>${Document.Author}</span>
                <span>${Math.floor(AudioElement.duration)}</span>
            `;
            Song.style.order = Index;
            Song.style.cursor = "pointer";
            Discover.querySelector(".Items").appendChild(Song);

            Song.addEventListener("click", () => {
                Queue.length = 0;
                Queue.push(...Documents);
                const CurrentIndex = Queue.indexOf(Document);
                PlaySong(CurrentIndex);
            });
        };
    });
});

function PlaySong(Index) {
    const CurrentDocument = Queue[Index];
    const RawUrl = CurrentDocument.Url.replace("github.com", "raw.githubusercontent.com").replace("/raw/refs/heads/", "/");

    if (CurrentAudioElement) {
        CurrentAudioElement.pause();
        CurrentAudioElement.src = RawUrl;
    } else {
        CurrentAudioElement = new Audio(RawUrl);
    }

    CurrentAudioElement.volume = window.Volume;
    CurrentAudioElement.play();

    Api.Playback.querySelector(".Play").src = "../images/Pause.svg";
    Api.Playback.querySelector(".Data > img").src = CurrentDocument.Cover || "../images/Note.svg";
    Api.Playback.querySelector(".Data > div > span:first-child").innerHTML = CurrentDocument.Name;
    Api.Playback.querySelector(".Data > div > span:last-child").innerHTML = CurrentDocument.Author;

    Array.from(Discover.querySelector(".Table").querySelector(".Items").children).forEach(Song => {
        Song.style.backgroundColor = parseInt(Song.style.order) === Index ? "rgb(50, 50, 50)" : "";
    });

    CurrentAudioElement.addEventListener("timeupdate", () => {
        Api.Playback.querySelector(".Bar > .Fill").style.width = `${(CurrentAudioElement.currentTime / CurrentAudioElement.duration) * 100}%`;
        Api.Playback.querySelector(".Bar > .Fill > span:first-child").innerHTML = Math.floor(CurrentAudioElement.currentTime);
        Api.Playback.querySelector(".Bar > .Fill > span:last-child").innerHTML = Math.floor(CurrentAudioElement.duration - CurrentAudioElement.currentTime);
    });

    CurrentAudioElement.onended = () => {
        if (Index < Queue.length - 1) PlaySong(Index + 1);
    };

    Api.Playback.querySelector(".Play").onclick = () => {
        if (CurrentAudioElement.paused) {
            CurrentAudioElement.play();
            Api.Playback.querySelector(".Play").src = "../images/Pause.svg";
        } else {
            CurrentAudioElement.pause();
            Api.Playback.querySelector(".Play").src = "../images/Next.svg";
        }
    };

    Api.Playback.querySelector(".Next").onclick = () => {
        if (Index < Queue.length - 1) PlaySong(Index + 1);
    };

    Api.Playback.querySelector(".Previous").onclick = () => {
        if (Index > 0) PlaySong(Index - 1);
    };
}

const VolumeInput = document.querySelector(".VolumeInput")
const VolumeImage = document.querySelector(".VolumeImage");
const FullscreenButton = document.querySelector(".FullscreenButton");
let Fullscreen = false;

FullscreenButton.addEventListener("click", () => {
    Fullscreen = !Fullscreen;
    if (Fullscreen) {
        document.body.requestFullscreen();
        FullscreenButton.src = "../images/FullscreenExit.svg";
    } else {
        document.exitFullscreen();
        FullscreenButton.src = "../images/Fullscreen.svg";
    }
});

VolumeInput.value = localStorage.getItem("Volume");
VolumeInput.addEventListener("input", function () {
    window.Volume = parseInt(this.value) / 100;
    localStorage.setItem("Volume", parseInt(this.value));
    if (CurrentAudioElement) CurrentAudioElement.volume = window.Volume;

    if (window.Volume > 0 && window.Volume <= 0.25) VolumeImage.src = "../images/VolumeLow.svg";
    else if (window.Volume > 0.25 && window.Volume <= 0.5) VolumeImage.src = "../images/VolumeMedium.svg";
    else if (window.Volume > 0.5 && window.Volume <= 0.75) VolumeImage.src = "../images/VolumeHigh.svg";
    else if (window.Volume > 0.75) VolumeImage.src = "../images/VolumeHigh.svg";
    else VolumeImage.src = "../images/VolumeMute.svg";
});

if (localStorage.getItem("Page")) new Api.Content(localStorage.getItem("Page")).Show();

document.querySelectorAll(".TooltipHost[host]").forEach(Host => {
    const Client = document.querySelectorAll(`.TooltipLabel[client="${Host.getAttribute("host")}"]`)[0];
    Client.style.opacity = 0;
    Host.addEventListener("mouseenter", () => {
        Client.style.opacity = 1;
    });
    Host.addEventListener("mouseleave", () => {
        Client.style.opacity = 0;
    });
});