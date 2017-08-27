const amend = (mbrs, season) => {
  let members = [...mbrs];

  if (season === 2014) {
    members = members.map(m => {
      const { tags, ...rest } = m;
      const member = { ...rest };

      if (member.id === 4) {
        // Move team to Padua
        member.firstName = 'Matthew';
        member.lastName = 'Dziedzicki';
      }

      if (member.id === 7) {
        // Move team to Chris
        member.firstName = 'Chris';
        member.lastName = 'Dziedzicki';
      }

      return {
        ...member,
        tags,
      };
    });
  }

  if (season === 2015) {
    members = members.map(m => {
      const { tags, ...rest } = m;
      const member = { ...rest };

      if (member.id === 9) {
        // Move team to Padua
        member.firstName = 'Zak';
        member.lastName = 'Walcher';
        member.name = 'Black Magic';
      }

      return {
        ...member,
        tags,
      };
    });
  }

  if (season === 2016) {
    members = members.map(m => {
      const { tags, ...rest } = m;
      const member = { ...rest };

      if (member.id === 7) {
        // Move team to Jason Pero
        member.abbrev = 'PERO';
        member.alias = 'KURT';
        member.firstName = 'Jason';
        member.lastName = 'Pero';
      }

      return {
        ...member,
        tags,
      };
    });
  }

  members = members.map(m => {
    const member = { ...m };

    if (member.firstName === 'Gary' && member.lastName === 'Bixler') {
      // Erase any Gary's
      member.firstName = 'Mike';
    }

    return member;
  });

  return members;
};

export default amend;
