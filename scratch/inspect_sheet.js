const SHEET_ID = '1LD8_0Lyowc7ShqR0-m9EnTpHpFtqRhd5GpfZRr3dGV4';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

fetch(url)
    .then(res => res.text())
    .then(text => {
        const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*?)\);?\s*$/);
        const json = JSON.parse(match[1]);
        const cols = json.table.cols.map(c => c.label || '');
        console.log("COLUMNS:");
        console.log(cols);
        
        const rows = json.table.rows.map(row => {
            const obj = {};
            row.c.forEach((cell, i) => {
                obj[cols[i]] = cell ? (cell.v !== null && cell.v !== undefined ? cell.v : (cell.f || '')) : '';
            });
            return obj;
        });
        
        console.log("\nFIRST 2 ROWS SAMPLE:");
        console.log(JSON.stringify(rows.slice(0, 2), null, 2));
    })
    .catch(err => console.error(err));
