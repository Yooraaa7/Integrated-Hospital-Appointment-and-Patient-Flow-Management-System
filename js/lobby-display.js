const departmentGrid =
    document.getElementById(
        "departmentGrid"
    );

const displayTime =
    document.getElementById(
        "displayTime"
    );


function updateClock() {

    displayTime.textContent =
        new Date().toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );
}


function renderLobby() {

    const departments =
        QMS.getDepartments();

    departmentGrid.innerHTML =
        "";


    departments.forEach(
        department => {

            const queues =
                QMS.getDepartmentQueues(
                    department.name
                );

            const active =
                QMS.getActiveServing(
                    department.name
                );

            const latest =
                active[0] || null;

            const waiting =
                queues.filter(
                    queue =>
                        queue.status === "WAIT"
                ).length;

            const next =
                queues
                    .filter(
                        queue =>
                            queue.status === "WAIT"
                    )
                    .sort(
                        (a, b) =>
                            new Date(a.issuedTime) -
                            new Date(b.issuedTime)
                    )[0] || null;


            const card =
                document.createElement(
                    "article"
                );

            card.className =
                "department-card";


            card.innerHTML = `
                <h3>${department.name}</h3>

                <p>Now Serving</p>

                <strong>
                    ${latest ? latest.queueNumber : "—"}
                </strong>

                <div class="lobby-counter">
                    ${
                        latest
                            ? latest.counter
                            : "No active counter"
                    }
                </div>

                <div class="lobby-waiting">
                    ${waiting}
                    ${waiting === 1 ? "patient" : "patients"}
                    waiting
                </div>

                <small class="lobby-next">
                    ${
                        next
                            ? `Next: ${next.queueNumber}`
                            : "No queue waiting"
                    }
                </small>
            `;


            departmentGrid.appendChild(
                card
            );
        }
    );
}


updateClock();
renderLobby();


setInterval(
    updateClock,
    1000
);

setInterval(
    renderLobby,
    1000
);

window.addEventListener(
    "storage",
    renderLobby
);
