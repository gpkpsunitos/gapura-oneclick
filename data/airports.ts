export const INDONESIAN_AIRPORTS = [
    // Java, Bali, Lombok
    { code: 'CGK', name: 'Soekarno-Hatta International Airport', city: 'Jakarta (Tangerang)' },
    { code: 'HLP', name: 'Halim Perdanakusuma International Airport', city: 'Jakarta' },
    { code: 'DPS', name: 'I Gusti Ngurah Rai International Airport', city: 'Denpasar' },
    { code: 'SUB', name: 'Juanda International Airport', city: 'Surabaya' },
    { code: 'JOG', name: 'Adisutjipto International Airport', city: 'Yogyakarta' },
    { code: 'YIA', name: 'Yogyakarta International Airport', city: 'Yogyakarta (Kulon Progo)' },
    { code: 'SRG', name: 'Jenderal Ahmad Yani International Airport', city: 'Semarang' },
    { code: 'SOC', name: 'Adi Soemarmo International Airport', city: 'Solo' },
    { code: 'BDO', name: 'Husein Sastranegara International Airport', city: 'Bandung' },
    { code: 'KJT', name: 'Kertajati International Airport', city: 'Majalengka' },
    { code: 'LOP', name: 'Lombok International Airport', city: 'Praya (Lombok)' },
    { code: 'BWX', name: 'Banyuwangi International Airport', city: 'Banyuwangi' },
    { code: 'MLG', name: 'Abdul Rachman Saleh Airport', city: 'Malang' },

    // Sumatra
    { code: 'KNO', name: 'Kualanamu International Airport', city: 'Medan' },
    { code: 'BTH', name: 'Hang Nadim International Airport', city: 'Batam' },
    { code: 'PDG', name: 'Minangkabau International Airport', city: 'Padang' },
    { code: 'PLM', name: 'Sultan Mahmud Badaruddin II International Airport', city: 'Palembang' },
    { code: 'PKU', name: 'Sultan Syarif Kasim II International Airport', city: 'Pekanbaru' },
    { code: 'BTJ', name: 'Sultan Iskandar Muda International Airport', city: 'Banda Aceh' },
    { code: 'DJB', name: 'Sultan Thaha Airport', city: 'Jambi' },
    { code: 'TKG', name: 'Radin Inten II Airport', city: 'Bandar Lampung' },
    { code: 'BKS', name: 'Fatmawati Soekarno Airport', city: 'Bengkulu' },
    { code: 'PGK', name: 'Depati Amir Airport', city: 'Pangkal Pinang' },
    { code: 'TJQ', name: 'H.A.S. Hanandjoeddin Airport', city: 'Tanjung Pandan' },

    // Kalimantan
    { code: 'BPN', name: 'Sultan Aji Muhammad Sulaiman Sepinggan Airport', city: 'Balikpapan' },
    { code: 'PNK', name: 'Supadio International Airport', city: 'Pontianak' },
    { code: 'BDJ', name: 'Syamsudin Noor International Airport', city: 'Banjarmasin' },
    { code: 'AAP', name: 'Aji Pangeran Tumenggung Pranoto Airport', city: 'Samarinda' },
    { code: 'TRK', name: 'Juwata International Airport', city: 'Tarakan' },
    { code: 'PKY', name: 'Tjilik Riwut Airport', city: 'Palangkaraya' },

    // Sulawesi
    { code: 'UPG', name: 'Sultan Hasanuddin International Airport', city: 'Makassar' },
    { code: 'MDC', name: 'Sam Ratulangi International Airport', city: 'Manado' },
    { code: 'KDI', name: 'Haluoleo Airport', city: 'Kendari' },
    { code: 'PLW', name: 'Mutiara SIS Al-Jufrie Airport', city: 'Palu' },
    { code: 'GTO', name: 'Djalaluddin Airport', city: 'Gorontalo' },

    // Nusa Tenggara & Maluku & Papua
    { code: 'KOE', name: 'El Tari International Airport', city: 'Kupang' },
    { code: 'LBJ', name: 'Komodo International Airport', city: 'Labuan Bajo' },
    { code: 'AMQ', name: 'Pattimura Airport', city: 'Ambon' },
    { code: 'TTE', name: 'Sultan Babullah Airport', city: 'Ternate' },
    { code: 'DJJ', name: 'Sentani International Airport', city: 'Jayapura' },
    { code: 'BIK', name: 'Frans Kaisiepo International Airport', city: 'Biak' },
    { code: 'MKQ', name: 'Mopah Airport', city: 'Merauke' },
    { code: 'TIM', name: 'Mozes Kilangin Airport', city: 'Timika' },
    { code: 'SOQ', name: 'Domine Eduard Osok Airport', city: 'Sorong' },
    { code: 'MKW', name: 'Rendani Airport', city: 'Manokwari' },
] as const;

export type IndonesianAirportCode = typeof INDONESIAN_AIRPORTS[number]['code'];
