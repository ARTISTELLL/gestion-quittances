const PDFDocument = require('pdfkit');
const fs = require('fs-extra');
const path = require('path');

async function generateQuittance(locataire, config, mois, annee) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const outputDir = path.join(__dirname, '../quittances');
      fs.ensureDirSync(outputDir);
      
      const fileName = `quittance_${locataire.id}_${mois}_${annee}.pdf`;
      const filePath = path.join(outputDir, fileName);
      const stream = fs.createWriteStream(filePath);
      
      doc.pipe(stream);
      
      // En-tête avec nom de l'application
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .text(config.appName || 'Gestion Quittances', { align: 'center' });
      
      doc.moveDown(2);
      
      // Informations du locataire
      doc.fontSize(12)
         .font('Helvetica')
         .text(`Locataire(s) : ${locataire.prenom} ${locataire.nom}`, { align: 'left' });
      
      doc.moveDown(0.5);
      doc.text(`Adresse : ${locataire.adresse || 'Non renseignée'}`);
      
      doc.moveDown(1);
      
      // Objet
      doc.font('Helvetica-Bold')
         .text(`Objet : Quittance de loyer du mois de ${mois} ${annee}`);
      
      doc.moveDown(1);
      
      // Date
      const dateQuittance = new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      doc.font('Helvetica')
         .text(`Date : ${dateQuittance}`);
      
      doc.moveDown(1.5);
      
      // Corps de la quittance
      const proprietaireNom = `${config.proprietaire.prenom} ${config.proprietaire.nom}`.trim();
      const locataireNom = `${locataire.prenom} ${locataire.nom}`.trim();
      
      // Calcul de la date de fin de mois
      const moisIndex = new Date(`${mois} 1, ${annee}`).getMonth();
      const dernierJour = new Date(annee, moisIndex + 1, 0).getDate();
      
      doc.text('Madame, Monsieur,', { align: 'left' });
      doc.moveDown(0.5);
      
      const texteQuittance = `Je soussigné ${proprietaireNom || '[Nom du propriétaire]'}, propriétaire du logement désigné ci-dessus, déclare avoir reçu de ${locataireNom}, la somme de ${(locataire.loyer + locataire.charges).toFixed(2)} euros, au titre du paiement du loyer et des charges pour la période de location du 1er ${mois} ${annee} au ${dernierJour} ${mois} ${annee} et lui en donne quittance, sous réserve de tous mes droits.`;
      
      doc.text(texteQuittance, { align: 'justify' });
      
      doc.moveDown(1.5);
      
      // Détail du règlement
      doc.font('Helvetica-Bold')
         .text('Détail du règlement :');
      
      doc.moveDown(0.5);
      doc.font('Helvetica')
         .text(`Loyer : ${locataire.loyer.toFixed(2)} euros`);
      
      doc.moveDown(0.5);
      doc.text(`Provision pour charges : ${locataire.charges.toFixed(2)} euros`);
      
      doc.moveDown(0.5);
      doc.text(`(le cas échéant, contribution aux économies d'énergies) : 0,00 euros`);
      
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold')
         .text(`Total : ${(locataire.loyer + locataire.charges).toFixed(2)} euros`);
      
      doc.moveDown(1.5);
      
      // Date du paiement
      doc.text(`Date du paiement : le ${dateQuittance}`);
      
      doc.moveDown(2);
      
      // Signature
      doc.text('Signature', { align: 'left' });
      doc.moveDown(1);
      
      if (config.proprietaire?.signature) {
        try {
          const base64 = config.proprietaire.signature.replace(/^data:image\/\w+;base64,/, '');
          const sigBuffer = Buffer.from(base64, 'base64');
          doc.image(sigBuffer, { width: 120, height: 50 });
          doc.moveDown(1);
        } catch (e) {
          doc.text(proprietaireNom || '[Nom du propriétaire]', { align: 'left' });
        }
      } else {
        doc.text(proprietaireNom || '[Nom du propriétaire]', { align: 'left' });
      }
      
      doc.moveDown(2);
      
      // Informations légales
      doc.fontSize(8)
         .font('Helvetica')
         .text('Informations légales :', { align: 'left' });
      doc.moveDown(0.3);
      doc.text('Cette quittance est établie conformément à la loi n° 89-462 du 6 juillet 1989 tendant à améliorer les rapports locatifs.', { align: 'justify' });
      doc.moveDown(0.3);
      doc.text('En cas de litige, le locataire peut saisir la commission départementale de conciliation ou le juge compétent.', { align: 'justify' });
      doc.moveDown(0.3);
      doc.text('Le propriétaire est tenu de délivrer une quittance de loyer à chaque paiement effectué par le locataire.', { align: 'justify' });
      
      doc.end();
      
      stream.on('finish', () => {
        resolve(filePath);
      });
      
      stream.on('error', reject);
      
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { generateQuittance };
