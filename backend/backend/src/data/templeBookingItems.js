/**
 * First-run catalogue for the public booking form (collection templebookingitems).
 * Inserted only when the collection is empty; after that Admin -> Bookings
 * (catalogue) is the source of truth.
 *
 * Prices are copied from the temple's two notice boards (the same figures as
 * frontend/src/data/serviceCharges.js), so none are placeholders. Capacity and
 * time slots are defaults chosen here: venues and shoots take one booking per
 * day, pujas have no limit and no fixed slots. The committee should review them.
 */

const L = (ne, en) => ({ ne, en });

const CAT = {
  wedding: L('विवाह', 'Wedding'),
  bratabandha: L('ब्रतबन्ध', 'Bratabandha'),
  tikatala: L('टिकाटाला', 'Tikatala'),
  shooting: L('सुटिङ्ग', 'Shooting'),
  puja: L('पूजा तथा सेवा', 'Puja and Services'),
};

const venue = (cat, key, name, price, order) => ({
  key, category: cat, categoryLabel: CAT[cat], name, price, capacity: 1, order,
});
const puja = (key, name, price, order, detail) => ({
  key, category: 'puja', categoryLabel: CAT.puja, name, price, capacity: 0, order,
  ...(detail ? { detail } : {}),
});

const DEFAULT_BOOKING_ITEMS = [
  venue('wedding', 'wedding-venue', L('विवाह गर्ने ठाउँ', 'Venue for the wedding'), 7500, 10),
  venue('wedding', 'wedding-venue-jagge', L('विवाह गर्ने ठाउँ जग्गे सहित', 'Venue with jagge'), 9500, 11),
  venue('wedding', 'wedding-venue-jagge-catering', L('विवाह गर्ने ठाउँ जग्गे र क्याटरिङ्ग सहित', 'Venue with jagge and catering'), 11500, 12),

  venue('bratabandha', 'bratabandha-venue', L('ब्रतबन्ध गर्ने ठाउँ', 'Venue for the bratabandha'), 7500, 20),
  venue('bratabandha', 'bratabandha-venue-jagge', L('ब्रतबन्ध गर्ने ठाउँ जग्गे सहित', 'Venue with jagge'), 9500, 21),
  venue('bratabandha', 'bratabandha-venue-jagge-catering', L('ब्रतबन्ध गर्ने ठाउँ जग्गे र क्याटरिङ्ग सहित', 'Venue with jagge and catering'), 11500, 22),

  venue('tikatala', 'tikatala-venue', L('टिकाटाला गर्ने ठाउँ', 'Venue for the tikatala'), 7500, 30),
  venue('tikatala', 'tikatala-venue-jagge-catering', L('टिकाटाला गर्ने ठाउँ जग्गे र क्याटरिङ्ग सहित', 'Venue with jagge and catering'), 9500, 31),

  venue('shooting', 'shooting-cinema', L('सिनेमा', 'Cinema'), 15500, 40),
  venue('shooting', 'shooting-teleserial', L('टेलिसिरियल/भिडियो', 'Tele-serial / video'), 7500, 41),
  venue('shooting', 'shooting-photo', L('फोटो सुट', 'Photo shoot'), 1500, 42),

  puja('annakuta-utsav', L('अन्नकूट उत्सव', 'Annakuta Utsav'), 51001, 50),
  puja('navami-archana', L('नवमी अर्चना एवं भक्तिवन्दना', 'Navami Archana and Bhaktivandana'), 21000, 51),
  puja('trimanjan', L('त्रिमञ्जन', 'Trimanjan'), 2100, 52, L('संक्रान्ति, मसान्त, नवमी, पूर्णिमा', 'Sankranti, Masanta, Navami, Purnima')),
  puja('vishnu-sahasranama', L('विष्णुसहस्रनाम अर्चना', 'Vishnu Sahasranama Archana'), 1008, 53),
  puja('hanuman-chalisa', L('हनुमानचालिसा पाठ', 'Hanuman Chalisa recitation'), 1101, 54),
  puja('morning-bhogaraga', L('बिहानको भोगराग', 'Morning Bhogaraga'), 1101, 55),
  puja('balbhog', L('बालभोग', 'Balbhog'), 501, 56),
  puja('tulsi-archana-108', L('१०८ तुलसी अर्चना', '108 Tulsi Archana'), 301, 57),
  puja('ekadashi-falahar', L('एकादशी फलाहार अर्पण', 'Ekadashi Falahar offering'), 501, 58),
  puja('aarti', L('आरती', 'Aarti'), 500, 59),
];

module.exports = { DEFAULT_BOOKING_ITEMS };
