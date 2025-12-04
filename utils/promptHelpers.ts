export interface RuleItem {
  id: string;
  texto: string;
}

export interface BranchInfo {
  id: string;
  tag: string;
  etiqueta: string;
  responsable: string;
  telefonos: string[];
  emails: string[];
  sitio: string;
  direccion: string;
  horario: string;
  enlace: string;
}

export interface CompanyInfo {
  acerca: string;
  servicios: string[];
}

export interface ExampleItem {
  id: string;
  pregunta: string;
  respuesta: string;
}

export interface PromptData {
  role: string;
  purpose: string;
  coreRules: RuleItem[];
  behaviorRules: RuleItem[];
  negativePrompt: string;
  tools: string;
  company: CompanyInfo;
  branches: BranchInfo[];
  examples: ExampleItem[];
}

export const createId = (): string => Math.random().toString(36).slice(2, 11);

export const createEmptyPromptData = (): PromptData => ({
  role: '',
  purpose: '',
  coreRules: [],
  behaviorRules: [],
  negativePrompt: '',
  tools: '',
  company: {
    acerca: '',
    servicios: []
  },
  branches: [],
  examples: []
});

export const slugify = (value: string, fallback: string): string => {
  const normalized = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  if (normalized) {
    return normalized;
  }
  return fallback;
};

export const formatLabel = (value: string): string => {
  if (!value) return '';
  const withSpaces = value.replace(/[_-]+/g, ' ');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
};

const normalizeKey = (value: string | undefined): string => {
  if (!value) return '';
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
};

const addKeyVariants = (set: Set<string>, value: string | undefined) => {
  const key = normalizeKey(value);
  if (!key) return;
  set.add(key);
  if (key.startsWith('sucursal_')) {
    set.add(key.replace(/^sucursal_/, ''));
  }
};

const buildBranchKeys = (branch: BranchInfo): string[] => {
  const keys = new Set<string>();
  addKeyVariants(keys, branch.tag);
  addKeyVariants(keys, branch.etiqueta);
  addKeyVariants(keys, branch.direccion);
  return Array.from(keys);
};

const buildCandidateKeys = (...values: (string | undefined)[]): string[] => {
  const keys = new Set<string>();
  values.forEach((value) => addKeyVariants(keys, value));
  return Array.from(keys);
};

const findBranchIndexByKeys = (branches: BranchInfo[], candidates: string[]): number => {
  if (!candidates.length) return -1;
  return branches.findIndex((branch) => {
    const branchKeys = buildBranchKeys(branch);
    return candidates.some((candidate) => branchKeys.includes(candidate));
  });
};

const parseRuleSection = (content: string | undefined): RuleItem[] => {
  if (!content) return [];
  const matchedRules = content.match(/<rule>([\s\S]*?)<\/rule>/g);
  if (matchedRules && matchedRules.length > 0) {
    return matchedRules
      .map((rule) => rule.replace(/<rule>([\s\S]*?)<\/rule>/, '$1').trim())
      .filter(Boolean)
      .map((texto) => ({ id: createId(), texto }));
  }

  const fallback = content
    .split(/\n+/)
    .map((rule) => rule.trim())
    .filter(Boolean);
  return fallback.map((texto) => ({ id: createId(), texto }));
};

const parsePhones = (value: string | undefined): string[] => {
  if (!value) return [];
  return value
    .split(/[,;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseEmails = (value: string | undefined): string[] => {
  if (!value) return [];
  return value
    .split(/[,;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseBranchTag = (tag: string | undefined, fallback: string): string => {
  if (!tag) return fallback;
  return slugify(tag, fallback);
};

const parseNameFromTag = (tag: string): string => {
  if (!tag) return '';
  const withSpaces = tag.replace(/[_-]+/g, ' ');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
};

const indentBlock = (value: string, indent: string): string => {
  return value
    .split('\n')
    .map((line) => `${indent}${line}`)
    .join('\n');
};

export const parseXMLPrompt = (xmlString: string): PromptData => {
  const data: PromptData = createEmptyPromptData();

  try {
    const roleMatch = xmlString.match(/<role>([\s\S]*?)<\/role>/);
    if (roleMatch) {
      data.role = roleMatch[1].trim();
    }

    const purposeMatch = xmlString.match(/<purpose>([\s\S]*?)<\/purpose>/);
    if (purposeMatch) {
      data.purpose = purposeMatch[1].trim();
    }

    const coreRulesMatch = xmlString.match(/<core_rules>([\s\S]*?)<\/core_rules>/);
    if (coreRulesMatch) {
      data.coreRules = parseRuleSection(coreRulesMatch[1]);
    } else {
      const legacyRulesMatch = xmlString.match(/<rules>([\s\S]*?)<\/rules>/);
      if (legacyRulesMatch) {
        data.coreRules = parseRuleSection(legacyRulesMatch[1]);
      }
    }

    const behaviorRulesMatch = xmlString.match(/<behavior_rules>([\s\S]*?)<\/behavior_rules>/);
    if (behaviorRulesMatch) {
      data.behaviorRules = parseRuleSection(behaviorRulesMatch[1]);
    }

    const negativePromptMatch = xmlString.match(/<negative_prompt>([\s\S]*?)<\/negative_prompt>/);
    if (negativePromptMatch) {
      data.negativePrompt = negativePromptMatch[1].trim();
    }

    const toolsMatch = xmlString.match(/<tools>([\s\S]*?)<\/tools>/);
    if (toolsMatch) {
      data.tools = toolsMatch[1].trim();
    }

    const companyMatch = xmlString.match(/<company>([\s\S]*?)<\/company>/);
    if (companyMatch) {
      const companyContent = companyMatch[1];
      const about = companyContent.match(/<about>([\s\S]*?)<\/about>/)?.[1]?.trim() || '';
      data.company.acerca = about;

      const servicesMatch = companyContent.match(/<services>([\s\S]*?)<\/services>/);
      if (servicesMatch) {
        const services = servicesMatch[1].match(/<service>([\s\S]*?)<\/service>/g) || [];
        data.company.servicios = services
          .map((service) => service.replace(/<service>([\s\S]*?)<\/service>/, '$1').trim())
          .filter(Boolean);
      }

      const locationsMatch = companyContent.match(/<locations>([\s\S]*?)<\/locations>/);
      if (locationsMatch) {
      const locations = locationsMatch[1].match(/<location>([\s\S]*?)<\/location>/g) || [];
      locations.forEach((location, index) => {
        const fallbackTag = `sucursal_${index + 1}`;
        const locationContent = location.replace(/<location>([\s\S]*?)<\/location>/, '$1').trim();
        if (!locationContent) {
          return;
        }

        const hasStructuredFields = /<location_(name|address|phone|mail|link|hours)>/i.test(locationContent);

        if (hasStructuredFields) {
          const name =
            locationContent.match(/<location_name>([\s\S]*?)<\/location_name>/)?.[1]?.trim() || '';
          const address =
            locationContent.match(/<location_address>([\s\S]*?)<\/location_address>/)?.[1]?.trim() ||
            '';
          const phoneMatches =
            locationContent.match(/<location_phone>([\s\S]*?)<\/location_phone>/g) || [];
          const emailMatches =
            locationContent.match(/<location_mail>([\s\S]*?)<\/location_mail>/g) || [];
          const link =
            locationContent.match(/<location_link>([\s\S]*?)<\/location_link>/)?.[1]?.trim() || '';
          const hours =
            locationContent.match(/<location_hours>([\s\S]*?)<\/location_hours>/)?.[1]?.trim() || '';

          const phoneValues = phoneMatches
            .map((phone) => phone.replace(/<location_phone>([\s\S]*?)<\/location_phone>/, '$1').trim())
            .filter(Boolean);
          const emailValues = emailMatches
            .map((email) => email.replace(/<location_mail>([\s\S]*?)<\/location_mail>/, '$1').trim())
            .filter(Boolean);

          const baseTag = name || address || fallbackTag;
          const slugTag = slugify(baseTag, fallbackTag);
          const candidates = buildCandidateKeys(name, address, slugTag, fallbackTag);
          const existingIndex = findBranchIndexByKeys(data.branches, candidates);

          const branch: BranchInfo =
            existingIndex >= 0
              ? data.branches[existingIndex]
              : {
                  id: createId(),
                  tag: slugTag,
                  etiqueta: formatLabel(baseTag),
                  responsable: '',
                  telefonos: [],
                  emails: [],
                  sitio: '',
                  direccion: '',
                  horario: '',
                  enlace: ''
                };

          branch.tag = slugTag || branch.tag;
          branch.etiqueta = name || branch.etiqueta || formatLabel(baseTag);
          branch.direccion = address || branch.direccion;
          branch.telefonos = phoneValues.length ? phoneValues : branch.telefonos;
          branch.emails = emailValues.length ? emailValues : branch.emails;
          branch.enlace = link || branch.enlace;
          branch.horario = hours || branch.horario;

          if (existingIndex >= 0) {
            data.branches[existingIndex] = branch;
          } else {
            data.branches.push(branch);
          }

          return;
        }

        const texto = locationContent;
        const baseTag = texto || fallbackTag;
        const slugTag = slugify(baseTag, fallbackTag);
        const candidates = buildCandidateKeys(texto, slugTag, fallbackTag);
        const existingIndex = findBranchIndexByKeys(data.branches, candidates);

        const branch: BranchInfo =
          existingIndex >= 0
            ? data.branches[existingIndex]
            : {
                id: createId(),
                tag: slugTag,
                etiqueta: formatLabel(texto),
                responsable: '',
                telefonos: [],
                emails: [],
                sitio: '',
                direccion: '',
                horario: '',
                enlace: ''
              };

        branch.tag = slugTag || branch.tag;
        branch.etiqueta = branch.etiqueta || formatLabel(texto);
        branch.direccion = texto || branch.direccion;

        if (existingIndex >= 0) {
          data.branches[existingIndex] = branch;
        } else {
          data.branches.push(branch);
        }
      });
    }
    }

    const contactsMatch = xmlString.match(/<contacts>([\s\S]*?)<\/contacts>/);
    if (contactsMatch) {
      const contactEntries = contactsMatch[1].match(/<([^>]+)>([\s\S]*?)<\/\1>/g) || [];
      contactEntries.forEach((entry, index) => {
        const tagMatch = entry.match(/^<([^>]+)>/);
        const tag = tagMatch?.[1] || `sucursal_${index + 1}`;
        const content = entry.replace(/^<[^>]+>|<\/[^>]+>$/g, '');
        const name = content.match(/<name>([\s\S]*?)<\/name>/)?.[1]?.trim() || '';
        const phone = content.match(/<phone>([\s\S]*?)<\/phone>/)?.[1]?.trim() || '';
        const email = content.match(/<email>([\s\S]*?)<\/email>/)?.[1]?.trim() || '';
        const website = content.match(/<website>([\s\S]*?)<\/website>/)?.[1]?.trim() || '';

        const fallbackTag = `sucursal_${index + 1}`;
        const preferredSlugSource = name || tag || fallbackTag;
        const slugTag = slugify(preferredSlugSource, fallbackTag);
        const candidates = buildCandidateKeys(tag, name, slugTag, fallbackTag);
        const currentIndex = findBranchIndexByKeys(data.branches, candidates);

        const branch: BranchInfo = currentIndex >= 0 ? data.branches[currentIndex] : {
          id: createId(),
          tag: slugTag,
          etiqueta: name || parseNameFromTag(slugTag),
          responsable: name || '',
          telefonos: [],
          emails: [],
          sitio: '',
          direccion: '',
          horario: '',
          enlace: ''
        };

        branch.tag = slugTag || branch.tag;
        if (name) {
          branch.etiqueta = branch.etiqueta || name;
        } else if (!branch.etiqueta) {
          branch.etiqueta = parseNameFromTag(branch.tag);
        }
        branch.responsable = name || branch.responsable;
        branch.telefonos = phone ? parsePhones(phone) : branch.telefonos;
        branch.emails = email ? parseEmails(email) : branch.emails;
        branch.sitio = website || branch.sitio;

        if (currentIndex >= 0) {
          data.branches[currentIndex] = branch;
        } else {
          data.branches.push(branch);
        }
      });
    }

    const locationsMatch = xmlString.match(/<locations>([\s\S]*?)<\/locations>/);
    if (locationsMatch) {
      const locationEntries = locationsMatch[1].match(/<location>([\s\S]*?)<\/location>/g) || [];
      locationEntries.forEach((entry, index) => {
        const content = entry.replace(/^<location>|<\/location>$/g, '');
        const name = content.match(/<location_name>([\s\S]*?)<\/location_name>/)?.[1]?.trim() || '';
        const address =
          content.match(/<location_address>([\s\S]*?)<\/location_address>/)?.[1]?.trim() || '';
        const phones = content.match(/<location_phone>([\s\S]*?)<\/location_phone>/g) || [];
        const emails = content.match(/<location_mail>([\s\S]*?)<\/location_mail>/g) || [];
        const link = content.match(/<location_link>([\s\S]*?)<\/location_link>/)?.[1]?.trim() || '';
        const hours = content.match(/<location_hours>([\s\S]*?)<\/location_hours>/)?.[1]?.trim() || '';

        const fallbackTag = `sucursal_${index + 1}`;
        const baseTag = name || address || fallbackTag;
        const slugTag = slugify(baseTag, fallbackTag);

        const candidates = buildCandidateKeys(name, address, slugTag, fallbackTag);
        const existingIndex = findBranchIndexByKeys(data.branches, candidates);
        const branch: BranchInfo = existingIndex >= 0 ? data.branches[existingIndex] : {
          id: createId(),
          tag: slugTag,
          etiqueta: formatLabel(baseTag),
          responsable: '',
          telefonos: [],
          emails: [],
          sitio: '',
          direccion: '',
          horario: '',
          enlace: ''
        };

        branch.tag = slugTag || branch.tag;
        branch.etiqueta = name || branch.etiqueta || formatLabel(baseTag);
        branch.direccion = address || branch.direccion;
        branch.telefonos = phones.length
          ? phones.map((phone) => phone.replace(/<location_phone>([\s\S]*?)<\/location_phone>/, '$1').trim())
          : branch.telefonos;
        branch.emails = emails.length
          ? emails.map((email) => email.replace(/<location_mail>([\s\S]*?)<\/location_mail>/, '$1').trim())
          : branch.emails;
        branch.enlace = link || branch.enlace;
        branch.horario = hours || branch.horario;

        if (existingIndex >= 0) {
          data.branches[existingIndex] = branch;
        } else {
          data.branches.push(branch);
        }
      });
    }

    const examplesMatch = xmlString.match(/<examples>([\s\S]*?)<\/examples>/);
    if (examplesMatch) {
      const exampleEntries = examplesMatch[1].match(/<example>([\s\S]*?)<\/example>/g) || [];
      data.examples = exampleEntries
        .map((entry) => {
          const question = entry.match(/<question>([\s\S]*?)<\/question>/)?.[1]?.trim() || '';
          const answer = entry.match(/<answer>([\s\S]*?)<\/answer>/)?.[1]?.trim() || '';
          if (!question && !answer) {
            return null;
          }
          return {
            id: createId(),
            pregunta: question,
            respuesta: answer
          } as ExampleItem;
        })
        .filter((item): item is ExampleItem => Boolean(item));
    }
  } catch (error) {
    console.error('Error al interpretar el prompt en XML:', error);
  }

  return data;
};

export const generateXMLPrompt = (data: PromptData): string => {
  let xmlString = '<assistant>\n';

  if (data.role.trim()) {
    xmlString += `  <role>${data.role.trim()}</role>\n`;
  }

  if (data.purpose.trim()) {
    xmlString += `  <purpose>${data.purpose.trim()}</purpose>\n`;
  }

  const coreRules = data.coreRules.map((rule) => rule.texto.trim()).filter(Boolean);
  if (coreRules.length) {
    xmlString += '  <core_rules>\n';
    coreRules.forEach((rule) => {
      xmlString += `    <rule>${rule}</rule>\n`;
    });
    xmlString += '  </core_rules>\n';
  }

  const behaviorRules = data.behaviorRules.map((rule) => rule.texto.trim()).filter(Boolean);
  if (behaviorRules.length) {
    xmlString += '  <behavior_rules>\n';
    behaviorRules.forEach((rule) => {
      xmlString += `    <rule>${rule}</rule>\n`;
    });
    xmlString += '  </behavior_rules>\n';
  }

  const negativePrompt = data.negativePrompt.trim();
  if (negativePrompt) {
    xmlString += '  <negative_prompt>\n';
    xmlString += `${indentBlock(negativePrompt, '    ')}\n`;
    xmlString += '  </negative_prompt>\n';
  }

  const tools = data.tools.trim();
  if (tools) {
    xmlString += '  <tools>\n';
    xmlString += `${indentBlock(tools, '    ')}\n`;
    xmlString += '  </tools>\n';
  }

  const detailedLocations = data.branches.filter((branch) => {
    const hasPhones = branch.telefonos.some((phone) => phone.trim());
    const hasEmails = branch.emails.some((email) => email.trim());
    return (
      branch.etiqueta.trim() ||
      branch.direccion.trim() ||
      hasPhones ||
      hasEmails ||
      branch.horario.trim() ||
      branch.enlace.trim()
    );
  });

  const about = data.company.acerca.trim();
  const services = data.company.servicios.map((service) => service.trim()).filter(Boolean);
  const hasCompanyLocations = detailedLocations.length > 0;

  if (about || services.length || hasCompanyLocations) {
    xmlString += '  <company>\n';
    if (about) {
      xmlString += `    <about>${about}</about>\n`;
    }
    if (services.length) {
      xmlString += '    <services>\n';
      services.forEach((service) => {
        xmlString += `      <service>${service}</service>\n`;
      });
      xmlString += '    </services>\n';
    }
    if (hasCompanyLocations) {
      xmlString += '    <locations>\n';
      detailedLocations.forEach((branch) => {
        xmlString += '      <location>\n';
        if (branch.etiqueta.trim()) {
          xmlString += `        <location_name>${branch.etiqueta.trim()}</location_name>\n`;
        }
        if (branch.direccion.trim()) {
          xmlString += `        <location_address>${branch.direccion.trim()}</location_address>\n`;
        }
        branch.telefonos.forEach((phone) => {
          if (phone.trim()) {
            xmlString += `        <location_phone>${phone.trim()}</location_phone>\n`;
          }
        });
        branch.emails.forEach((email) => {
          if (email.trim()) {
            xmlString += `        <location_mail>${email.trim()}</location_mail>\n`;
          }
        });
        if (branch.enlace.trim()) {
          xmlString += `        <location_link>${branch.enlace.trim()}</location_link>\n`;
        }
        if (branch.horario.trim()) {
          xmlString += `        <location_hours>${branch.horario.trim()}</location_hours>\n`;
        }
        xmlString += '      </location>\n';
      });
      xmlString += '    </locations>\n';
    }
    xmlString += '  </company>\n';
  }

  const examples = data.examples.filter(
    (example) => example.pregunta.trim() || example.respuesta.trim()
  );
  if (examples.length) {
    xmlString += '  <examples>\n';
    examples.forEach((example) => {
      if (!example.pregunta.trim() && !example.respuesta.trim()) {
        return;
      }
      xmlString += '    <example>\n';
      if (example.pregunta.trim()) {
        xmlString += `      <question>${example.pregunta.trim()}</question>\n`;
      }
      if (example.respuesta.trim()) {
        xmlString += `      <answer>${example.respuesta.trim()}</answer>\n`;
      }
      xmlString += '    </example>\n';
    });
    xmlString += '  </examples>\n';
  }

  xmlString += '</assistant>';
  return xmlString;
};
