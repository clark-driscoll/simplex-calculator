function generateInputs() {
  const numVars = parseInt(document.getElementById("numVars").value);
  const numConstraints = parseInt(document.getElementById("numConstraints").value);
  const container = document.getElementById("inputFields");

  container.innerHTML = "";

  const obj = document.createElement("div");
  obj.innerHTML = "<h3>Objective Function (Maximize)</h3>";
  for (let i = 0; i < numVars; i++) {
    obj.innerHTML += `x<sub>${i + 1}</sub>: <input type="number" name="obj" step="any"> `;
  }
  container.appendChild(obj);

  container.innerHTML += "<h3>Constraints</h3>";

  for (let i = 0; i < numConstraints; i++) {
    const row = document.createElement("div");
    for (let j = 0; j < numVars; j++) {
      row.innerHTML += `x<sub>${j + 1}</sub>: <input type="number" name="con${i}" step="any"> `;
    }
    row.innerHTML += ` ≤ <input type="number" name="rhs${i}" step="any">`;
    container.appendChild(row);
  }
}

function solveSimplex() {
  const numVars = parseInt(document.getElementById("numVars").value);
  const numConstraints = parseInt(document.getElementById("numConstraints").value);

  const c = Array.from(document.getElementsByName("obj"))
    .map(v => -parseFloat(v.value || 0));

  const A = [], b = [];
  for (let i = 0; i < numConstraints; i++) {
    A.push(Array.from(document.getElementsByName("con" + i))
      .map(v => parseFloat(v.value || 0)));
    b.push(parseFloat(document.getElementsByName("rhs" + i)[0].value || 0));
  }

  const result = simplexWithSteps(c, A, b);
  const output = document.getElementById("output");
  output.innerHTML = "";

  if (result.status !== "Success") {
    output.innerHTML = "❌ " + result.status;
    return;
  }

  result.steps.forEach((tab, i) => {
    output.innerHTML += `<h3>Iteration ${i}</h3>`;
    output.appendChild(renderTableau(tab, numVars, numConstraints));
  });

  const finalTableau = result.steps[result.steps.length - 1];
  const solution = extractSolution(finalTableau, numVars, numConstraints);

  output.innerHTML += `<h3>✅ Optimal Value: ${result.optimal_value.toFixed(2)}</h3>`;
  output.innerHTML += `<h3>Variable Values</h3>`;
  solution.forEach((v, i) => {
    output.innerHTML += `x<sub>${i + 1}</sub> = ${v.toFixed(2)}<br>`;
  });
}

function simplexWithSteps(c, A, b) {
  const m = A.length, n = c.length;
  const steps = [];
  let tableau = [];

  for (let i = 0; i < m; i++) {
    const row = [...A[i]];
    for (let j = 0; j < m; j++) row.push(i === j ? 1 : 0);
    row.push(b[i]);
    tableau.push(row);
  }

  tableau.push([...c, ...Array(m).fill(0), 0]);
  steps.push(deepCopy(tableau));

  while (true) {
    const lastRow = tableau[tableau.length - 1];
    const entering = lastRow.slice(0, -1).findIndex(v => v < 0);
    if (entering === -1) break;

    let minRatio = Infinity, leaving = -1;
    for (let i = 0; i < m; i++) {
      if (tableau[i][entering] > 0) {
        const ratio = tableau[i][tableau[0].length - 1] / tableau[i][entering];
        if (ratio < minRatio) {
          minRatio = ratio;
          leaving = i;
        }
      }
    }

    if (leaving === -1) return { status: "Unbounded" };

    const pivot = tableau[leaving][entering];
    tableau[leaving] = tableau[leaving].map(v => v / pivot);

    for (let i = 0; i < tableau.length; i++) {
      if (i !== leaving) {
        const factor = tableau[i][entering];
        tableau[i] = tableau[i].map(
          (v, j) => v - factor * tableau[leaving][j]
        );
      }
    }

    steps.push(deepCopy(tableau));
  }

  return {
    status: "Success",
    optimal_value: tableau[tableau.length - 1][tableau[0].length - 1],
    steps
  };
}

function extractSolution(tableau, numVars, numConstraints) {
  const solution = Array(numVars).fill(0);
  const rhs = tableau[0].length - 1;

  for (let j = 0; j < numVars; j++) {
    const col = tableau.slice(0, numConstraints).map(row => row[j]);
    if (
      col.filter(v => Math.abs(v - 1) < 1e-6).length === 1 &&
      col.filter(v => Math.abs(v) < 1e-6).length === numConstraints - 1
    ) {
      solution[j] = tableau[col.indexOf(1)][rhs];
    }
  }
  return solution;
}

function renderTableau(tableau, numVars, numConstraints) {
  const table = document.createElement("table");
  table.className = "simplex-table";

  const header = document.createElement("tr");
  for (let i = 0; i < numVars; i++) header.innerHTML += `<th>x${i + 1}</th>`;
  for (let i = 0; i < numConstraints; i++) header.innerHTML += `<th>s${i + 1}</th>`;
  header.innerHTML += "<th>RHS</th>";
  table.appendChild(header);

  tableau.forEach(row => {
    const tr = document.createElement("tr");
    row.forEach(v => {
      const td = document.createElement("td");
      td.textContent = Number(v.toFixed(3));
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });

  return table;
}

function deepCopy(mat) {
  return mat.map(row => [...row]);
}
